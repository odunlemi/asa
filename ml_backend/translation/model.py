from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

MODEL_ID = "facebook/nllb-200-distilled-600M"
SRC_LANG = "eng_Latn"
TGT_LANG = "yor_Latn"
MAX_NEW_TOKENS = 256


class TranslationModel:
    def __init__(self) -> None:
        self._tokenizer = AutoTokenizer.from_pretrained(
            MODEL_ID,
            src_lang=SRC_LANG,
        )
        self._model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_ID)
        self._model.eval()

    def translate(self, text: str) -> str:
        inputs = self._tokenizer(
            text,
            return_tensors="pt",
        )

        target_lang_id = self._tokenizer.convert_tokens_to_ids(TGT_LANG)

        output_tokens = self._model.generate(
            **inputs,
            forced_bos_token_id=target_lang_id,
            max_new_tokens=MAX_NEW_TOKENS,
            max_length=None,
        )

        return self._tokenizer.batch_decode(
            output_tokens,
            skip_special_tokens=True,
        )[0]
