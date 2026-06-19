import outetts

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

        audio_2d = output.audio.detach().cpu()
        if audio_2d.dim() == 1:
            audio_2d = audio_2d.unsqueeze(0)

        return tensor_to_b64_wav(audio_2d, output.sr)
