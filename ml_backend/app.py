import os
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel, Field

from transcription.client import AssemblyAIClient

app = FastAPI(title="Asa ML Backend")

_translation_model = None
_tts_pipeline = None


def get_translation_model():
    global _translation_model
    if _translation_model is None:
        from translation.model import TranslationModel

        _translation_model = TranslationModel()
    return _translation_model


def get_tts_pipeline():
    global _tts_pipeline
    if _tts_pipeline is None:
        from pipeline.tts import TtsPipeline

        _tts_pipeline = TtsPipeline()
    return _tts_pipeline


class TranslateRequest(BaseModel):
    text: str


class SynthesiseRequest(BaseModel):
    text: str = Field(max_length=500)


class TranscribeUrlRequest(BaseModel):
    upload_url: str


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


@app.post("/transcribe-url")
def transcribe_url(body: TranscribeUrlRequest) -> dict:
    """Submit and poll a transcript for audio already uploaded to AssemblyAI."""
    try:
        client = AssemblyAIClient()
        job_id = client.submit(body.upload_url)
        text = client.poll(job_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"text": text}


@app.post("/translate")
def translate(body: TranslateRequest) -> dict:
    yoruba = get_translation_model().translate(body.text)
    return {"yoruba": yoruba}


@app.post("/synthesise")
def synthesise(body: SynthesiseRequest) -> dict:
    audio_b64 = get_tts_pipeline().run(body.text)
    return {"audio_b64": audio_b64}

