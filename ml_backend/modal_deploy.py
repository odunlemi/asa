import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
)

app = modal.App("asa-tts", image=image)


@app.cls(gpu="T4", secrets=[modal.Secret.from_name("hf-token")])
class YorubaTTS:
    @modal.enter()
    def load(self):
        from pipeline.tts import TtsPipeline

        self.pipeline = TtsPipeline()

    @modal.web_endpoint(method="POST")
    def synthesise(self, body: dict):
        audio_b64 = self.pipeline.run(body["text"])
        return {"audio_b64": audio_b64}
