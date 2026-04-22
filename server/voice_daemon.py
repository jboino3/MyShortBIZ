from fastapi import FastAPI
from pydantic import BaseModel

from services.thesis_voice_service import thesis_voice_service

app = FastAPI(title="MyShortBIZ Thesis Voice Daemon")


class GeneratePreviewRequest(BaseModel):
    user_id: str
    prompt_path: str
    text: str
    variant: str | None = None


@app.on_event("startup")
def startup_event():
    thesis_voice_service.preload_variants()


@app.get("/health")
def health():
    return {"status": "ok", "service": "thesis-voice-daemon"}


@app.post("/generate-preview")
def generate_preview(payload: GeneratePreviewRequest):
    return thesis_voice_service.generate_preview_local(
        user_id=payload.user_id,
        prompt_path=payload.prompt_path,
        text=payload.text,
        variant=payload.variant,
    )
