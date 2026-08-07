MODEL_ID = "OuteAI/Llama-OuteTTS-1.0-1B"
OUTPUT_REPO = "abiodun-longe/outetts-yoruba-1b"

BATCH_SIZE = 4
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 0.01
EPOCHS = 3
GRADIENT_ACCUMULATION_STEPS = 4

SAMPLE_RATE = 24000

# QLoRA configuration.
# Base model is loaded in 4-bit NF4 quantization (bitsandbytes).
# LoRA adapters are applied to the attention projection layers only.
# This keeps the trainable parameter count low enough for a T4 GPU
# while still allowing the model to adapt to Yoruba phonetics.
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj"]

# NaijaVoices Yoruba split is ~600 hours; a full run is infeasible on
# Kaggle's free tier (9h session limit, 30h/week quota). Training is
# capped to a curated subset instead.
MAX_TRAINING_HOURS = 8.0
MAX_SAMPLES = None  # set at runtime once average clip length is known

CHECKPOINT_DIR = "checkpoints"
# Lowered from 200: 100 costs little extra (a few MB per save) and roughly
# halves the exposure to the same failure mode.
CHECKPOINT_EVERY_N_STEPS = 100
