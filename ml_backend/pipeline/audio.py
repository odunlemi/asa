import base64
import io
import wave

import numpy as np


def tensor_to_b64_wav(waveform, sample_rate: int) -> str:
    """Encode a waveform tensor as a base64 WAV string, in memory.

    Writes raw PCM via the stdlib wave module rather than torchaudio.save,
    which requires torchcodec and system FFmpeg libraries that are not
    present in the deploy image.
    """
    audio = waveform.detach().cpu().numpy()

    if audio.ndim == 2:
        audio = audio[0]

    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())

    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")
