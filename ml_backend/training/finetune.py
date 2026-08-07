"""QLoRA fine-tuning recipe for the OuteTTS-1.0-1B Yoruba adapter.

Note: this is an experimental/research training recipe. The production Asa
backend uses Davlan/m2m100_418M-eng-yor-mt for English->Yoruba translation
and Shinzmann/soro-tts-yor for text-to-speech. Keep this script for future
OuteTTS experiments; it is not on the live inference path.
"""
import os
import tempfile

import torch
import torch.utils
import torch.utils.data
import torchaudio
from torch.utils.data import DataLoader, Dataset

# OuteTTS's bundled DAC audio codec checkpoint uses a legacy torch.package
# format incompatible with torch 2.6+ weights_only=True default. The patch
# below must run before any outetts import. It is applied to torch.serialization
# directly to avoid recursion if this module is reloaded in a Jupyter session.
import torch.serialization as _torch_serialization
_orig_serialization_load = _torch_serialization.load

def _patched_serialization_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_serialization_load(*args, **kwargs)

_torch_serialization.load = _patched_serialization_load
torch.load = _patched_serialization_load

from training.config import (
    BATCH_SIZE,
    CHECKPOINT_DIR,
    CHECKPOINT_EVERY_N_STEPS,
    EPOCHS,
    GRADIENT_ACCUMULATION_STEPS,
    LEARNING_RATE,
    LORA_ALPHA,
    LORA_DROPOUT,
    LORA_R,
    LORA_TARGET_MODULES,
    MODEL_ID,
    OUTPUT_REPO,
    WEIGHT_DECAY,
)
from training.dataset import load_yoruba_subset


def get_hf_token() -> str:
    """Read HF_TOKEN from Kaggle Secrets if running on Kaggle, else env."""
    try:
        from kaggle_secrets import UserSecretsClient
        return UserSecretsClient().get_secret("HF_TOKEN")
    except ImportError:
        token = os.environ.get("HF_TOKEN")
        if not token:
            raise RuntimeError(
                "HF_TOKEN not found. Set it as a Kaggle Secret named "
                "HF_TOKEN, or export it as an environment variable."
            )
        return token


def _setup_whisper_cache():
    """Cache Whisper model loads inside OuteTTS's create_speaker().

    OuteTTS calls whisper.load_model() once per training sample. Caching
    the returned model by (name, device) keeps the dataset build from
    spending ~10-15s per sample re-loading the same checkpoint.
    """
    import whisper

    if getattr(whisper, "_asa_cache_patched", False):
        return

    whisper._asa_original_load_model = whisper.load_model
    _cache = {}

    def _cached_load_model(name, device=None, **kwargs):
        key = (name, device)
        if key not in _cache:
            _cache[key] = whisper._asa_original_load_model(name, device=device, **kwargs)
        return _cache[key]

    whisper.load_model = _cached_load_model
    whisper._asa_whisper_cache = _cache
    whisper._asa_cache_patched = True


def _release_whisper_cache():
    """Clear cached Whisper weights and free GPU memory before training."""
    try:
        import whisper
    except ImportError:
        return

    cache = getattr(whisper, "_asa_whisper_cache", None)
    if cache is not None:
        cache.clear()
        del cache
    for attr in ("_asa_whisper_cache", "_asa_original_load_model", "_asa_cache_patched"):
        if hasattr(whisper, attr):
            delattr(whisper, attr)

    torch.cuda.empty_cache()


class YorubaSpeakerDataset(Dataset):
    """Wraps raw NaijaVoices samples into OuteTTS training prompts.

    Each sample is written to a temp WAV (create_speaker needs a file
    path, not a raw array), passed through OuteTTS's own speaker
    creation and Whisper-based feature extraction, then formatted via
    the library's own get_training_prompt so the format exactly
    matches what the base model was pretrained on.
    """

    def __init__(self, raw_samples, interface, tokenizer):
        self._interface = interface
        self._tokenizer = tokenizer
        self._prompts = []

        for sample in raw_samples:
            try:
                self._prompts.append(self._build_prompt(sample))
            except Exception as exc:
                print(f"Skipping sample due to error: {exc}")

    def _build_prompt(self, sample) -> str:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            waveform = torch.tensor(sample["audio_array"]).unsqueeze(0).float()
            torchaudio.save(tmp.name, waveform, sample["sampling_rate"])
            tmp_path = tmp.name

        try:
            speaker = self._interface.create_speaker(audio_path=tmp_path)
            speaker["text"] = sample["text"]
            prompt = self._interface.prompt_processor.get_training_prompt(speaker)
        finally:
            os.unlink(tmp_path)

        return prompt

    def __len__(self):
        return len(self._prompts)

    def __getitem__(self, idx):
        return self._prompts[idx]


def collate(batch, tokenizer):
    encoded = tokenizer(
        batch,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=1024,
        add_special_tokens=False,
    )
    encoded["labels"] = encoded["input_ids"].clone()
    return encoded


def find_latest_checkpoint() -> str | None:
    if not os.path.isdir(CHECKPOINT_DIR):
        return None
    checkpoints = sorted(
        (d for d in os.listdir(CHECKPOINT_DIR) if d.startswith("step-")),
        key=lambda d: int(d.split("-")[1]),
    )
    return os.path.join(CHECKPOINT_DIR, checkpoints[-1]) if checkpoints else None


def load_qlora_model(model_id: str, hf_token: str):
    """Load the base model in 4-bit NF4 quantization and wrap with LoRA adapters.

    The base model is loaded directly via AutoModelForCausalLM rather than
    through OuteTTS's Interface, because quantization config must be supplied
    at load time and cannot be applied to an already-loaded model. OuteTTS's
    Interface is kept alive separately, used only for prompt building and
    speaker creation.

    Returns the LoRA-wrapped model and tokenizer.
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        token=hf_token,
    )

    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=LORA_TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)

    return model, tokenizer


def train():
    # Cache Whisper loads before OuteTTS is imported; its speaker creation
    # re-loads Whisper for every sample otherwise.
    _setup_whisper_cache()

    import outetts

    hf_token = get_hf_token()
    os.environ["HF_TOKEN"] = hf_token

    print("Loading OuteTTS interface for prompt building...")
    model_config = outetts.ModelConfig.auto_config(
        model=outetts.Models.VERSION_1_0_SIZE_1B,
        backend=outetts.Backend.HF,
    )
    interface = outetts.Interface(config=model_config)

    print("Loading base model in 4-bit NF4 quantization with LoRA adapters...")
    resume_path = find_latest_checkpoint()
    if resume_path:
        from transformers import AutoTokenizer
        from peft import PeftModel, AutoModelForCausalLM
        print(f"Resuming from checkpoint: {resume_path}")
        base_model, tokenizer = load_qlora_model(MODEL_ID, hf_token)
        model = PeftModel.from_pretrained(base_model, resume_path)
        start_step = int(os.path.basename(resume_path).split("-")[1])
    else:
        model, tokenizer = load_qlora_model(MODEL_ID, hf_token)
        start_step = 0

    print("Loading and preparing Yoruba training data...")
    raw_samples = load_yoruba_subset()
    train_dataset = YorubaSpeakerDataset(raw_samples, interface, tokenizer)
    print(f"Prepared {len(train_dataset)} training prompts.")

    # Prompt building is complete; release the OuteTTS interface and
    # cached Whisper weights so the LLM can claim the GPU memory.
    train_dataset._interface = None
    del interface
    _release_whisper_cache()

    loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        collate_fn=lambda batch: collate(batch, tokenizer),
    )

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    model.train()
    step = start_step
    accumulated_loss = 0.0

    for epoch in range(EPOCHS):
        print(f"Epoch {epoch + 1}/{EPOCHS}")
        optimizer.zero_grad()

        for i, batch in enumerate(loader):
            batch = {k: v.to(model.device) for k, v in batch.items()}
            outputs = model(**batch)
            loss = outputs.loss / GRADIENT_ACCUMULATION_STEPS
            loss.backward()
            accumulated_loss += loss.item()

            if (i + 1) % GRADIENT_ACCUMULATION_STEPS == 0:
                optimizer.step()
                optimizer.zero_grad()
                step += 1
                print(f"step {step}, loss {accumulated_loss:.4f}")
                accumulated_loss = 0.0

                if step % CHECKPOINT_EVERY_N_STEPS == 0:
                    ckpt_path = os.path.join(CHECKPOINT_DIR, f"step-{step}")
                    model.save_pretrained(ckpt_path)
                    print(f"Saved checkpoint: {ckpt_path}")

    print(f"Training complete. Pushing LoRA adapters to {OUTPUT_REPO}")
    model.save_pretrained(OUTPUT_REPO)
    model.push_to_hub(OUTPUT_REPO, token=hf_token)
    tokenizer.push_to_hub(OUTPUT_REPO, token=hf_token)


if __name__ == "__main__":
    train()
