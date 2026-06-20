import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "libsdl2-dev",
        "libsdl2-image-dev",
        "libsdl2-mixer-dev",
        "libsdl2-ttf-dev",
        "build-essential",
        "cmake",
        "git",
    )
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("pipeline", "transcription", "translation")
    .add_local_file("app.py", "/root/app.py")
)

app = modal.App("asa-backend", image=image)


@app.function(
    gpu="T4",
    secrets=[
        modal.Secret.from_name("hf-token"),
        modal.Secret.from_name("assemblyai-key"),
    ],
)
@modal.asgi_app()
def fastapi_app():
    from app import app as web_app, get_translation_model, get_tts_pipeline

    # Pre-warm both models at container startup so the first real request
    # does not pay the model-load cost and time out (the lazy getters in
    # app.py are correct for local dev, but a cold /synthesise call here
    # was taking long enough to trip a request-level timeout).
    get_translation_model()
    get_tts_pipeline()

    return web_app
