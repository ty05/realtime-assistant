import httpx
import os

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """ElevenLabs STT APIに音声を送りテキストを返す"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data={"model_id": "scribe_v1"}
        )
        response.raise_for_status()
        result = response.json()
        return result.get("text", "")