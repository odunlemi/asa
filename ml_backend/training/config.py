MODEL_ID = "OuteAI/Llama-OuteTTS-1.0-1B"
OUTPUT_REPO = "abiodun-longe/outetts-yoruba-1b"

BATCH_SIZE = 4
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 0.01
EPOCHS = 3

SAMPLE_RATE = 24000

# NaijaVoices Yoruba split is ~600 hours; a full run is infeasible on
# Kaggle's free tier (9h session limit, 30h/week quota). Training is
# capped to a curated subset instead.
MAX_TRAINING_HOURS = 8.0
MAX_SAMPLES = None  # set at runtime once average clip length is known

CHECKPOINT_DIR = "checkpoints"
CHECKPOINT_EVERY_N_STEPS = 200
