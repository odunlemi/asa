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

The 1B OuteTTS model does not run reliably on memory-constrained local
machines (under 8GB RAM gets OOM-killed once NLLB-200 is also loaded).
Modal's T4 GPU instance has 16GB VRAM and handles the 1B model
comfortably, so TTS is tested directly on Modal rather than locally.

`/transcribe` and `/translate` remain fully testable locally via uvicorn.
`/synthesise` and `/transcribe-url` are tested only after deployment,
since `orchestrate` calls a single ML_BACKEND_URL for all stages.

## Important note on language support

The base OuteTTS-0.2-500M model supports English, Chinese, Japanese, and
Korean. Yoruba is not currently supported by the base model. Audio
synthesised from Yoruba text right now will not be correct Yoruba speech.

Real Yoruba output depends on the fine-tuned checkpoint from Feature 5.
Until that lands, test this endpoint with English text to confirm the
pipeline mechanics (model load, generation, base64 encoding, Modal
deploy) work end to end.

```bash
curl -X POST https://<your-endpoint>/synthesise \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?"}'
```
