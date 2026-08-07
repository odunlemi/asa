---
name: Test the Asa ML backend locally
description: How to stand up the ml_backend FastAPI service and verify translate, synthesise, and transcribe endpoints.
---

# Test the Asa ML backend locally

## Devin Secrets Needed
- `HF_TOKEN` / `hf-token` Modal secret — only needed if Hugging Face gated models or rate limits are hit. Public models (`Davlan/m2m100_418M-eng-yor-mt`, `Shinzmann/soro-tts-yor`) usually download without a token.
- `ASSEMBLYAI_API_KEY` — required only for `/transcribe` and `/transcribe-url`.

## Environment
A Python 3.10 venv is usually pre-built at `/tmp/nllb_test` with `torch`, `transformers`, `sentencepiece`, and `sacremoses`. The repo's `ml_backend/requirements.txt` should be the source of truth for the remaining packages (`fastapi`, `uvicorn`, `pydantic`, `httpx`, `python-multipart`).

## Steps
1. Make the backend directory current:
   ```bash
   cd /home/ubuntu/repos/asa/ml_backend
   ```
2. Install the non-ML dependencies (and verify the numpy pin is valid):
   ```bash
   /tmp/nllb_test/bin/pip install -r requirements.txt
   ```
   > If `requirements.txt` pins a numpy version that does not exist on PyPI (e.g. `numpy==2.4.4` in older commits), install the rest manually and use the pre-installed numpy.
3. Start the server:
   ```bash
   /tmp/nllb_test/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000 --log-level info
   ```
4. In another shell, exercise the endpoints:
   ```bash
   curl http://127.0.0.1:8000/
   curl -X POST http://127.0.0.1:8000/translate \
     -H "Content-Type: application/json" \
     -d '{"text":"Hello, how are you today?"}'
   curl -X POST http://127.0.0.1:8000/synthesise \
     -H "Content-Type: application/json" \
     -d '{"text":"<yoruba text from /translate>"}'
   ```
5. For `/transcribe` or `/transcribe-url`, set `ASSEMBLYAI_API_KEY` first:
   ```bash
   export ASSEMBLYAI_API_KEY=<key>
   curl -X POST http://127.0.0.1:8000/transcribe -F "audio=@sample.wav"
   ```

## Verifying /synthesise output
The response is a JSON object `{"audio_b64": "..."}`. Decode it and check WAV headers:
- `nchannels == 1` (mono)
- `sampwidth == 2` (16-bit PCM)
- `framerate == 16000` Hz
- `n_frames > 0`
- Mean absolute amplitude should be well above 0 (e.g. > 100) to confirm the audio is not silence.

## Known gotchas
- First requests to `/translate` and `/synthesise` trigger Hugging Face model downloads (m2m100 ~1.5 GB, VITS ~100 MB). Use `timeout=600` or more in the HTTP client.
- `modal deploy` uses `modal_deploy.py` and `pip_install_from_requirements("requirements.txt")`; an invalid pin there will fail the deploy even if the code runs locally.
- The local box often has no GPU, so `torch` falls back to CPU inference. It is still fast enough for smoke tests.
