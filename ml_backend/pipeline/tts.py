import io

import outetts
import torchaudio

from pipeline.audio import tensor_to_b64_wav

MODEL_PATH = "OuteAI/OuteTTS-0.2-500M"
DEFAULT_SPEAKER = "male_1"
SAMPLE_RATE = 24000


class TtsPipeline:
    def __init__(self) -> None:
        model_config = outetts.HFModelConfig_v1(
            model_path=MODEL_PATH,
            language="en",
        )
        self._interface = outetts.InterfaceHF(
            model_version="0.2",
            cfg=model_config,
        )
        self._speaker = self._interface.load_default_speaker(name=DEFAULT_SPEAKER)

    def run(self, text: str) -> str:
        output = self._interface.generate(
            text=text,
            temperature=0.1,
            repetition_penalty=1.1,
            max_length=4096,
            speaker=self._speaker,
        )

        buffer = io.BytesIO()
        output.save(buffer)
        buffer.seek(0)
        waveform, sample_rate = torchaudio.load(buffer)

        return tensor_to_b64_wav(waveform, sample_rate)

