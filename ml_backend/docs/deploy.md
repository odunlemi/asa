# TTS Deployment

How to deploy the synthesis endpoint to Modal.

---

## Prerequisites

```bash
pip install modal
modal setup
```

Create a Modal secret named `hf-token` containing your Hugging Face token,
via the Modal dashboard or:

```bash
modal secret create hf-token HF_TOKEN=<your_token>
```

---

## Deploy

```bash
cd ml_backend
modal deploy modal_deploy.py
```

Modal prints an endpoint URL on success, shaped like:

```
https://<your-workspace>--asa-tts-yorubatts-synthesise.modal.run
```

---

## Wire into Convex

```bash
cd app
npx convex env set MODAL_TTS_ENDPOINT https://<your-workspace>--asa-tts-yorubatts-synthesise.modal.run
```

---

## Important note on local testing

The 1B OuteTTS model does not run reliably on memory-constrained local
machines (under 8GB RAM gets OOM-killed once NLLB-200 is also loaded).
Modal's T4 GPU instance has 16GB VRAM and handles the 1B model
comfortably, so TTS is tested directly on Modal rather than locally.

`/transcribe` and `/translate` remain fully testable locally via uvicorn.
`/synthesise` is tested only after deployment.

## Important note on language support

The base OuteTTS-0.2-500M model supports English, Chinese, Japanese, and
Korean. Yoruba is not currently supported by the base model. Audio
synthesised from Yoruba text right now will not be correct Yoruba speech.

Real Yoruba output depends on the fine-tuned checkpoint from Feature 5.
Until that lands, test this endpoint with English text to confirm the
pipeline mechanics (model load, generation, base64 encoding, Modal
deploy) work end to end.

```bash
curl -X POST https://<your-endpoint> \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?"}'
```
