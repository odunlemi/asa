import os
import tempfile

import httpx
from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel

from transcription.client import AssemblyAIClient

app = FastAPI(title="Asa ML Backend")

CONVEX_SITE_URL = os.environ.get("CONVEX_SITE_URL", "")


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
    """Shim that calls the Convex translate action for local testing."""
    if not CONVEX_SITE_URL:
        raise HTTPException(
            status_code=503,
            detail="CONVEX_SITE_URL is not set",
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{CONVEX_SITE_URL}/actions/translate",
                json={"text": body.text},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"yoruba": response.json()}
