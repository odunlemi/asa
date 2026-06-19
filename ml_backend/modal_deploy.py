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
)

app = modal.App("asa-tts", image=image)


@app.cls(gpu="T4", secrets=[modal.Secret.from_name("hf-token")])
class YorubaTTS:
    @modal.enter()
    def load(self):
        from pipeline.tts import TtsPipeline

        self.pipeline = TtsPipeline()

    @modal.fastapi_endpoint(method="POST")
    def synthesise(self, body: dict):
        audio_b64 = self.pipeline.run(body["text"])
        return {"audio_b64": audio_b64}
