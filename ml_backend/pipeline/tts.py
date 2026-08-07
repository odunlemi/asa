import torch
from transformers import AutoTokenizer, VitsModel

from pipeline.audio import tensor_to_b64_wav

MODEL_ID = "Shinzmann/soro-tts-yor"


class TtsPipeline:
    def __init__(self) -> None:
        self._tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        self._model = VitsModel.from_pretrained(MODEL_ID)
        self._model.eval()

    def run(self, text: str) -> str:
        inputs = self._tokenizer(text, return_tensors="pt")

        with torch.no_grad():
            output = self._model(**inputs).waveform

        return tensor_to_b64_wav(output, self._model.config.sampling_rate)
