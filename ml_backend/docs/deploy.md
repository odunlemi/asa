# Backend Deployment

How to deploy the full FastAPI backend (transcription, translation,
synthesis) to Modal as one service.

---

## Prerequisites

```bash
pip install modal
modal setup
```

Create two Modal secrets:

```bash
modal secret create hf-token HF_TOKEN=<your_hf_token>
modal secret create assemblyai-key ASSEMBLYAI_API_KEY=<your_assemblyai_key>
```

---

## Deploy

```bash
cd ml_backend
modal deploy modal_deploy.py
```

Modal prints an endpoint URL on success, shaped like:

```
https://<your-workspace>--asa-backend-fastapi-app.modal.run
```

This single URL serves all four routes: `/`, `/transcribe`,
`/transcribe-url`, `/translate`, `/synthesise`.

### Forcing a fresh container

By default Modal uses a rolling deployment: existing warm containers
keep serving requests on the old code until new containers finish
their own startup. During active development this can mean a test
request lands on a stale container running outdated logic.

To guarantee the next request hits fresh code immediately, terminate
existing containers as part of the deploy:

```bash
modal deploy modal_deploy.py --strategy recreate
```

This trades a moment of downtime for certainty, useful whenever a
deploy changes container startup behaviour (model pre-warming, secret
changes, dependency updates) and the next test needs to reflect that
change exactly.

---

## Wire into Convex

```bash
cd app
npx convex env set ML_BACKEND_URL https://<your-workspace>--asa-backend-fastapi-app.modal.run
```

---

## Important note on local testing

The production translation model is `Davlan/m2m100_418M-eng-yor-mt`
(~418M params) and the production TTS model is `Shinzmann/soro-tts-yor`
(~40M params). Both fit comfortably in a local CPU environment, so the
full `/translate` and `/synthesise` paths can be tested locally via
uvicorn before deploying to Modal.

`/synthesise` now expects Yoruba text (with diacritics for best
prosody). A quick local test:

```bash
python - <<'PY'
import requests
r = requests.post("http://localhost:8000/translate", json={"text": "Hello, how are you today?"})
print(r.json()["yoruba"])
PY
```

```bash
curl -X POST http://localhost:8000/synthesise \
  -H "Content-Type: application/json" \
  -d '{"text": "Ẹ ǹlẹ́ o, báwo lẹ ṣe rí lónìí?"}'
```

`/transcribe` and `/transcribe-url` still require an AssemblyAI API key
and are tested directly on Modal if you don't have one locally.

## Important note on language support

- Translation: English (`en`) → Yoruba (`yo`) via a general-domain
  M2M100 fine-tune.
- TTS: Yoruba text → speech via the `soro-tts-yor` VITS checkpoint.
  Inputs with tone marks/subdots produce the best prosody.
- `m2m100_418M-eng-yor-mt` is a fine-tune of `facebook/m2m100_418M`,
  which is MIT-licensed; `Shinzmann/soro-tts-yor` is a fine-tune of
  `facebook/mms-tts-yor` and is CC-BY-NC 4.0.
