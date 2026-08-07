import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("build-essential", "cmake", "git", "ffmpeg", "libsndfile1")
    .pip_install("protobuf<5.0.0")
    .pip_install("torchcodec")
    .pip_install("datasets")
    .pip_install_from_requirements("training/requirements-kaggle.txt")
    .add_local_python_source("training")
)

app = modal.App("asa-training", image=image)
checkpoint_volume = modal.Volume.from_name("asa-checkpoints", create_if_missing=True)


@app.function(
    gpu="L4",
    timeout=20 * 60 * 60,
    secrets=[modal.Secret.from_name("hf-token")],
    volumes={"/checkpoints": checkpoint_volume},
)
def train():
    import os
    os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"

    import sys
    import time
    import threading
    import torch
    import whisper

    import training.config as config
    # Overrides must happen before `training.finetune` is first imported,
    # since it binds these as local names at import time (`from
    # training.config import CHECKPOINT_DIR`, etc.), not a live reference.
    config.CHECKPOINT_DIR = "/checkpoints"
    config.CHECKPOINT_EVERY_N_STEPS = 100
    config.MAX_TRAINING_HOURS = 8.0

    import training.finetune as ft  # imported after overrides, so it captures them

    # persistent log, survives after the run, downloadable via `modal volume get`
    log_file = open("/checkpoints/training_log.txt", "a")

    class _Tee:
        def __init__(self, *streams):
            self.streams = streams
        def write(self, data):
            for s in self.streams:
                s.write(data)
        def flush(self):
            for s in self.streams:
                s.flush()

    sys.stdout = _Tee(sys.stdout, log_file)

    # commit the volume periodically, not just at the end, so a mid-run
    # crash can't lose checkpoints that were saved but never flushed
    def _periodic_commit():
        while True:
            time.sleep(600)
            checkpoint_volume.commit()

    threading.Thread(target=_periodic_commit, daemon=True).start()

    # OuteTTS's create_speaker() calls whisper.load_model() with no
    # caching, once per training sample. Cache it ourselves so the model
    # loads once per run instead of once per sample (measured: cuts
    # dataset-build time by roughly 8x). Guarded with hasattr() so
    # re-running this in the same process can't cause infinite recursion
    # from re-capturing an already-patched reference as "the original."
    if not hasattr(whisper, "_uncached_load_model"):
        whisper._uncached_load_model = whisper.load_model

    _whisper_cache = {}

    def _cached_load_model(name, device=None, **kwargs):
        key = (name, device)
        if key not in _whisper_cache:
            _whisper_cache[key] = whisper._uncached_load_model(name, device=device, **kwargs)
        return _whisper_cache[key]

    whisper.load_model = _cached_load_model

    def _build_prompt(self, sample):
        import tempfile
        import torchaudio

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            waveform = torch.tensor(sample["audio_array"]).unsqueeze(0).float()
            torchaudio.save(tmp.name, waveform, sample["sampling_rate"])
            tmp_path = tmp.name

        try:
            # V3 interface models (this one included) always use Whisper
            # for speaker feature extraction regardless of whether a
            # transcript is passed, passing one is a no-op here.
            speaker = self._interface.create_speaker(audio_path=tmp_path)
            speaker["text"] = sample["text"]
            prompt = self._interface.prompt_processor.get_training_prompt(speaker)
        finally:
            os.unlink(tmp_path)

        return prompt

    ft.YorubaSpeakerDataset._build_prompt = _build_prompt

    def _load_yoruba_subset_safe(max_hours=None):
        from datasets import load_dataset

        if max_hours is None:
            max_hours = config.MAX_TRAINING_HOURS

        dataset = load_dataset(
            "naijavoices/naijavoices-dataset",
            "yoruba-batch-0",
            split="train",
            streaming=True,
        )

        collected = []
        total_seconds = 0.0
        max_seconds = max_hours * 3600
        skipped = 0

        for row in dataset:
            audio = row["audio"]
            try:
                array = audio["array"]
                sampling_rate = audio["sampling_rate"]
            except Exception as exc:
                skipped += 1
                print(f"Skipping corrupt sample: {exc}")
                continue

            duration = len(array) / sampling_rate
            collected.append({
                "text": row["text"],
                "audio_array": array,
                "sampling_rate": sampling_rate,
                "speaker_id": row.get("speaker_id"),
            })

            total_seconds += duration
            if total_seconds >= max_seconds:
                break

        if skipped:
            print(f"Skipped {skipped} corrupt/unreadable samples during dataset load.")

        return collected

    ft.load_yoruba_subset = _load_yoruba_subset_safe

    ft.train()
    checkpoint_volume.commit()


@app.local_entrypoint()
def main():
    train.remote()
