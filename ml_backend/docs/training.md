# Training the experimental OuteTTS Yoruba fine-tune

> **Note:** This guide documents an experimental/research OuteTTS-1.0-1B
> fine-tuning pipeline. The production Asa backend uses
> `Davlan/m2m100_418M-eng-yor-mt` for English→Yoruba translation and
> `Shinzmann/soro-tts-yor` for text-to-speech. Keep this recipe for future
> OuteTTS experiments.

Two environments are used: Kaggle for cheap, fast iteration on a small
data slice, and Modal for the real multi-hour run. Don't run the full
`MAX_TRAINING_HOURS` on Kaggle, its 12-hour session cap will kill a run
partway through.

## Kaggle (smoke testing only)

1. New notebook, GPU accelerator (T4).
2. Attach the `HF_TOKEN` secret under Add-ons → Secrets.
3. Setup cell:
   ```
   !apt-get update -q && apt-get install -y -q libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev
   !git clone https://github.com/odunlemi/asa.git
   !pip install -q -r /kaggle/working/asa/ml_backend/training/requirements-kaggle.txt
   ```
4. Env cell:
   ```python
   import os
   os.environ["USE_TF"] = "0"
   os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
   from kaggle_secrets import UserSecretsClient
   os.environ["HF_TOKEN"] = UserSecretsClient().get_secret("HF_TOKEN")
   ```
5. Run cell, small slice only:
   ```python
   import sys
   sys.path.insert(0, "/kaggle/working/asa/ml_backend")

   import training.config as config
   config.MAX_TRAINING_HOURS = 0.05  # keep this small on Kaggle

   from training.finetune import train
   train()
   ```

If restarting the kernel, everything above needs to run again in order,
`/kaggle/working` survives a kernel restart but the Python process (and
therefore all imports and env vars) does not.

## Modal (full runs)

`modal_train.py` (repo root of `ml_backend/`) has everything needed:
the memory-fragmentation fix, Whisper caching, and checkpoint
persistence via a Modal Volume.

1. `pip install modal` and `modal setup` (one-time, links your account).
2. Confirm the `hf-token` secret exists: `modal secret list` (shared
   with the existing `asa-backend` deployment).
3. From `ml_backend/`: `modal run modal_train.py`.
4. Monitor at modal.com under Apps → asa-training, or watch the
   terminal, logs stream live either way.
5. After it finishes: `modal volume get asa-checkpoints training_log.txt .`

### Resuming from a checkpoint

`training.finetune.find_latest_checkpoint()` looks for the highest
`step-N` folder under `CHECKPOINT_DIR`. To resume from a checkpoint
saved elsewhere (e.g. a Kaggle run that got cut off), upload it into
the volume first:

```
modal volume create asa-checkpoints
modal volume put asa-checkpoints /path/to/step-400 step-400
```

**Known issue:** this was tested once and didn't work as expected, the
training log showed zero "Resuming from checkpoint" lines despite a
checkpoint being present in the volume, and the run trained from step 0
instead. Not yet root-caused. Verify resume actually took effect (check
for that log line) before relying on it for a time-sensitive run.

## What's validated

- Full 1,524-step (3 epoch) run completes cleanly on Modal L4 in ~6 hours.
- Checkpoints save every 100 steps and the final adapter pushes to
  `abiodun-longe/outetts-yoruba-1b` on Hugging Face Hub automatically.
- Steady-state GPU memory is flat throughout (no leak), confirmed via
  per-batch `torch.cuda.memory_allocated()` logging during debugging.

## What's not yet resolved

- Checkpoint resume (see above).
- Some generated samples (not all) produce NaN/degenerate output after
  merging the adapter, isolated to specific inputs, cause not yet found.
  Tested both bf16 and fp32 merge precision, no difference.