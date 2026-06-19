import base64
import io

import torchaudio


def tensor_to_b64_wav(waveform, sample_rate: int) -> str:
    """Encode a waveform tensor as a base64 WAV string, in memory."""
    buffer = io.BytesIO()
    torchaudio.save(buffer, waveform, sample_rate, format="wav")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")
