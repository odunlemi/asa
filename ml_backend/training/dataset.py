# Experimental OuteTTS-1.0-1B Yoruba fine-tuning data loader. The production Asa
# backend uses Davlan/m2m100_418M-eng-yor-mt and Shinzmann/soro-tts-yor; this
# loader is kept for future OuteTTS research runs.
from datasets import load_dataset

from training.config import MAX_TRAINING_HOURS

EXPECTED_FIELDS = {"audio", "text", "language", "speaker_id"}


def load_yoruba_subset(max_hours: float = MAX_TRAINING_HOURS):
    """Stream a NaijaVoices Yoruba batch and cap total audio duration.

    Requires registering at naijavoices.com and accepting the dataset
    terms on Hugging Face before this will authenticate successfully
    (run `huggingface-cli login` first).

    Loads the pre-split "yoruba-batch-0" config (~167 hours) rather
    than the full multilingual stream, then further caps to max_hours
    since even one batch exceeds a free Kaggle session.
    """
    dataset = load_dataset(
        "naijavoices/naijavoices-dataset",
        "yoruba-batch-0",
        split="train",
        streaming=True,
    )

    sample_row = next(iter(dataset))
    missing = EXPECTED_FIELDS - set(sample_row.keys())
    if missing:
        raise RuntimeError(
            f"NaijaVoices schema changed, missing expected fields: {missing}. "
            f"Actual fields: {list(sample_row.keys())}"
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
            # Some rows in the stream have malformed audio metadata that
            # torchcodec can't seek (seen in practice: a corrupt PTS value).
            # One bad row shouldn't kill loading the other ~8,000.
            skipped += 1
            print(f"Skipping corrupt sample: {exc}")
            continue

        duration = len(array) / sampling_rate

        collected.append(
            {
                "text": row["text"],
                "audio_array": array,
                "sampling_rate": sampling_rate,
                "speaker_id": row.get("speaker_id"),
            }
        )

        total_seconds += duration
        if total_seconds >= max_seconds:
            break

    if skipped:
        print(f"Skipped {skipped} corrupt/unreadable samples during dataset load.")

    return collected
