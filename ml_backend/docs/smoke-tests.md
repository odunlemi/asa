# Smoke Tests

Manual curl tests to verify each backend endpoint before wiring into the app.

---

## Setup

```bash
cd ml_backend
pip install -r requirements.txt
export ASSEMBLYAI_API_KEY=<your_key>
uvicorn app:app --reload
```

---

## GET / -- health check

```bash
curl http://localhost:8000/
# Expected: {"ok":true}
```

---

## POST /transcribe

Needs a real audio file. A short WAV or M4A recording of English speech works.

```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@/path/to/sample.wav"

# Expected:
# {"text":"<your spoken words here>"}
```

If AssemblyAI returns an error status the endpoint responds with HTTP 502
and a detail string from the AssemblyAI error field.

---

## POST /translate

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you today?"}'

# Expected:
# {"yoruba":"Ẹ ǹlẹ́ o, báwo lẹ ṣe rí lónìí?"}
```

---

## POST /synthesise

```bash
curl -X POST http://localhost:8000/synthesise \
  -H "Content-Type: application/json" \
  -d '{"text": "Ẹ ǹlẹ́ o, báwo lẹ ṣe rí lónìí?"}'

# Expected:
# {"audio_b64":"<base64-encoded WAV>"}
```

The returned audio is a 16 kHz mono WAV.

---

## Notes

- Poll interval is 1 second. A 5-second clip typically resolves in 3-6 seconds.
- The tmp file written during the request is always cleaned up, even on error.
- ASSEMBLYAI_API_KEY must be set in the shell before testing the transcription routes.
