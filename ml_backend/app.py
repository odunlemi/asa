import os
import tempfile

import httpx
from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel

from transcription.client import AssemblyAIClient

app = FastAPI(title="Asa ML Backend")


class TranslateRequest(BaseModel):
    text: str


@app.get("/")
def health() -> dict:
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(audio: UploadFile) -> dict:
    audio_bytes = await audio.read()

    suffix = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        client = AssemblyAIClient()
        text = client.transcribe(tmp_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)

    return {"text": text}


@app.post("/translate")
async def translate(body: TranslateRequest) -> dict:
    """Call NLLB-200 via HF Inference API and return Yoruba text."""
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        raise HTTPException(status_code=503, detail="HF_TOKEN is not set")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
                headers={
                    "Authorization": f"Bearer {hf_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": body.text,
                    "parameters": {
                        "src_lang": "eng_Latn",
                        "tgt_lang": "yor_Latn",
                    },
                },
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    data = response.json()
    yoruba = data[0].get("translation_text") if data else None

    if not yoruba:
        raise HTTPException(status_code=502, detail="No translation returned from NLLB-200")

    return {"yoruba": yoruba}
