import tempfile
import os

from fastapi import FastAPI, HTTPException, UploadFile

from transcription.client import AssemblyAIClient

app = FastAPI(title="Asa ML Backend")


@app.get("/")
def health() -> dict:
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(audio: UploadFile) -> dict:
    audio_bytes = await audio.read()
    # test file carried .m4a
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
