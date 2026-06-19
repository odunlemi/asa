import io

import outetts
import torchaudio

from pipeline.audio import tensor_to_b64_wav

MODEL = outetts.Models.VERSION_1_0_SIZE_1B
BACKEND = outetts.Backend.HF
DEFAULT_SPEAKER = "en-female-1-neutral"


class TtsPipeline:
    def __init__(self) -> None:
        model_config = outetts.ModelConfig.auto_config(
            model=MODEL,
            backend=BACKEND,
        )
        self._interface = outetts.Interface(config=model_config)
        self._speaker = self._interface.load_default_speaker(name=DEFAULT_SPEAKER)

    def run(self, text: str) -> str:
        generation_config = outetts.GenerationConfig(
            text=text,
            speaker=self._speaker,
        )
        output = self._interface.generate(config=generation_config)

        buffer = io.BytesIO()
        output.save(buffer)
        buffer.seek(0)
        waveform, sample_rate = torchaudio.load(buffer)

        return tensor_to_b64_wav(waveform, sample_rate)
