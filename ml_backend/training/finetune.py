import os
import tempfile

import torch
import torchaudio
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset

from training.config import (
    BATCH_SIZE,
    CHECKPOINT_DIR,
    CHECKPOINT_EVERY_N_STEPS,
    EPOCHS,
    LEARNING_RATE,
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
                "HF_TOKEN, or export it as an environment variable "
                "if running outside Kaggle."
            )
        return token


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
                # A handful of bad samples (silence, corrupt audio,
                # failed whisper alignment) should not crash the
                # entire training run.
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
        max_length=8192,
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


def train():
    import outetts

    hf_token = get_hf_token()
    os.environ["HF_TOKEN"] = hf_token

    print("Loading OuteTTS interface and base model...")
    model_config = outetts.ModelConfig.auto_config(
        model=outetts.Models.VERSION_1_0_SIZE_1B,
        backend=outetts.Backend.HF,
    )
    interface = outetts.Interface(config=model_config)
    model = interface.model.model
    tokenizer = interface.prompt_processor.tokenizer

    resume_path = find_latest_checkpoint()
    start_step = 0
    if resume_path:
        print(f"Resuming from checkpoint: {resume_path}")
        model = type(model).from_pretrained(resume_path)
        start_step = int(os.path.basename(resume_path).split("-")[1])

    print("Loading and preparing Yoruba training data...")
    raw_samples = load_yoruba_subset()
    train_dataset = YorubaSpeakerDataset(raw_samples, interface, tokenizer)
    print(f"Prepared {len(train_dataset)} training prompts.")

    loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        collate_fn=lambda batch: collate(batch, tokenizer),
    )

    optimizer = AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    model.train()
    step = start_step

    for epoch in range(EPOCHS):
        print(f"Epoch {epoch + 1}/{EPOCHS}")
        for batch in loader:
            outputs = model(**batch)
            loss = outputs.loss

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            step += 1
            if step % 10 == 0:
                print(f"step {step}, loss {loss.item():.4f}")

            if step % CHECKPOINT_EVERY_N_STEPS == 0:
                ckpt_path = os.path.join(CHECKPOINT_DIR, f"step-{step}")
                model.save_pretrained(ckpt_path)
                print(f"Saved checkpoint: {ckpt_path}")

    print(f"Training complete. Pushing final checkpoint to {OUTPUT_REPO}")
    model.push_to_hub(OUTPUT_REPO, token=hf_token)
    tokenizer.push_to_hub(OUTPUT_REPO, token=hf_token)


if __name__ == "__main__":
    train()
