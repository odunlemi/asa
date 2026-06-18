import os

import httpx


class AssemblyAIClient:
    BASE_URL = "https://api.assemblyai.com/v2"

    def __init__(self) -> None:
        api_key = os.environ.get("ASSEMBLYAI_API_KEY")
        if not api_key:
            raise RuntimeError("ASSEMBLYAI_API_KEY is not set")
        self._headers = {
            "authorization": api_key,
            "content-type": "application/json",
        }

    def upload(self, filepath: str) -> str:
        """Upload a local audio file and return the upload URL."""
        with open(filepath, "rb") as f:
            audio_bytes = f.read()

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{self.BASE_URL}/upload",
                headers={"authorization": self._headers["authorization"]},
                content=audio_bytes,
            )
            response.raise_for_status()

        return response.json()["upload_url"]
    
    def submit(self, upload_url: str) -> str:
        """Submit a transcription job and return the job ID."""
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f"{self.BASE_URL}/transcript",
                headers=self._headers,
                json={
                    "audio_url": upload_url,
                    "language_code": "en",
                },
            )
            response.raise_for_status()

        return response.json()["id"]
    
    def poll(self, job_id: str) -> str:
        """Poll until the transcript job is complete and return the text."""
        import time

        url = f"{self.BASE_URL}/transcript/{job_id}"

        with httpx.Client(timeout=30) as client:
            while True:
                response = client.get(url, headers=self._headers)
                response.raise_for_status()
                body = response.json()

                status = body["status"]

                if status == "completed":
                    return body["text"]
                
                if status == "error":
                    raise RuntimeError(
                        f"AssemblyAI transcription failed: {body.get('error')}"
                    )

                time.sleep(1)
                