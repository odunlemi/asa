"""Modal runner for the experimental OuteTTS-1.0-1B Yoruba fine-tune.

This is the training-only counterpart to the production `asa-backend`. The
production app uses Davlan/m2m100_418M-eng-yor-mt for translation and
Shinzmann/soro-tts-yor for text-to-speech. This script is kept for future
OuteTTS research runs.
"""
import os
import sys
import threading
import time

import modal

# Fragmentation-friendly allocator must be set before PyTorch is imported.
# `training.finetune` imports torch at module load, so this must precede it.
os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"

# Config overrides must happen before `training.finetune` is first imported,
# since it binds these as local names at import time, not as live references.
import training.config as config  # noqa: E402

config.CHECKPOINT_DIR = "/checkpoints"
config.CHECKPOINT_EVERY_N_STEPS = 100
config.MAX_TRAINING_HOURS = 8.0

import training.finetune as ft  # noqa: E402

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


class _Tee:
    def __init__(self, *streams):
        self.streams = streams

    def write(self, data):
        for s in self.streams:
            s.write(data)

    def flush(self):
        for s in self.streams:
            s.flush()


def _periodic_commit(volume, interval=600):
    """Flush the checkpoint volume to Modal storage every `interval` seconds."""
    while True:
        time.sleep(interval)
        volume.commit()


@app.function(
    gpu="L4",
    timeout=20 * 60 * 60,
    secrets=[modal.Secret.from_name("hf-token")],
    volumes={"/checkpoints": checkpoint_volume},
)
def train():
    # Persistent log; retrievable with `modal volume get asa-checkpoints training_log.txt .`
    log_file = open("/checkpoints/training_log.txt", "a")
    sys.stdout = _Tee(sys.stdout, log_file)

    threading.Thread(
        target=_periodic_commit,
        args=(checkpoint_volume,),
        daemon=True,
    ).start()

    ft.train()
    checkpoint_volume.commit()


@app.local_entrypoint()
def main():
    train.remote()
