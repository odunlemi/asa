from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

MODEL_ID = "Davlan/m2m100_418M-eng-yor-mt"
SRC_LANG = "en"
TGT_LANG = "yo"
MAX_NEW_TOKENS = 256


class TranslationModel:
    def __init__(self) -> None:
        self._tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        self._tokenizer.src_lang = SRC_LANG
        self._model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID)
        self._model.eval()
        self._target_lang_id = self._tokenizer.get_lang_id(TGT_LANG)

    def translate(self, text: str) -> str:
        inputs = self._tokenizer(
            text,
            return_tensors="pt",
        )

        output_tokens = self._model.generate(
            **inputs,
            forced_bos_token_id=self._target_lang_id,
            max_new_tokens=MAX_NEW_TOKENS,
            max_length=None,
        )

        return self._tokenizer.batch_decode(
            output_tokens,
            skip_special_tokens=True,
        )[0]
