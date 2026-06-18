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
    