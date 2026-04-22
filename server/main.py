import os
from importlib import import_module
from pathlib import Path
from threading import Thread
from time import sleep

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().with_name(".env"))
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from routers.auth import router as AuthRouter
from routers.contact import router as ContactRouter
from routers.content import router as ContentRouter
from routers.payments import router as PaymentsRouter
from routers.pricing import router as PricingRouter
from routers.thesis import router as ThesisRouter
from routers.vapi import router as VapiRouter

from db import Base, SessionLocal, engine
import models  # noqa: F401
from services.phone_speech_service import normalize_phone_tts_text
from services.telephony_session_service import telephony_session_service
from services.thesis_agent_service import thesis_agent_service
from services.thesis_generation_service import thesis_generation_service
from services.thesis_voice_service import thesis_voice_service

OPTIONAL_ROUTER_MODULES = [
    "routers.blog",
    "routers.dashboard",
    "routers.ai_cv",
    "routers.ai_bio",
    "routers.ai_social",
    "routers.ai_link",
    "routers.ai_video",
    "routers.video_prompt_builder",
]
STARTUP_PHONE_WARMUP_LIMIT = max(0, int(os.getenv("THESIS_STARTUP_PHONE_WARMUP_LIMIT", "4")))
REFERENCE_UPLOAD_CLEANUP_INTERVAL_SECONDS = max(
    60,
    int(os.getenv("THESIS_REFERENCE_UPLOAD_CLEANUP_INTERVAL_SECONDS", "3600")),
)

app = FastAPI(
    title="MyShortBIZ API",
    swagger_ui_parameters={"persistAuthorization": True},
)

Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _include_optional_router(module_path: str) -> None:
    try:
        module = import_module(module_path)
        router = getattr(module, "router", None)
        if router is not None:
            app.include_router(router)
    except Exception:
        pass


def _prewarm_exact_demo_voice():
    if STARTUP_PHONE_WARMUP_LIMIT == 0:
        return
    db = SessionLocal()
    try:
        context = telephony_session_service.build_call_context(db)
        prompt_path = context.get("voice_prompt_path")
        agent_config = context.get("agent_config", {})
        phone_config = context.get("phone_config", {})
        user_id = context.get("user_id")
        greeting = agent_config.get("greeting_script")
        business_name = agent_config.get("business_name", "MyShortBIZ")
        if prompt_path and user_id:
            warm_texts = thesis_agent_service.demo_phone_replies(
                agent_config=agent_config,
                phone_config=phone_config,
                business_name=business_name,
                prompts=thesis_agent_service.critical_demo_phone_prompts()[:STARTUP_PHONE_WARMUP_LIMIT],
            )
            if greeting:
                warm_texts = list(dict.fromkeys([greeting, *warm_texts]))

            for text in warm_texts:
                thesis_voice_service.generate_phone_pcm_local(
                    user_id,
                    prompt_path,
                    normalize_phone_tts_text(text),
                    8000,
                    variant=thesis_voice_service.conversation_model_variant,
                )
    except Exception:
        pass
    finally:
        db.close()


def _reference_upload_maintenance_loop():
    while True:
        sleep(REFERENCE_UPLOAD_CLEANUP_INTERVAL_SECONDS)
        thesis_voice_service.prune_reference_uploads()


@app.on_event("startup")
def startup_event():
    thesis_voice_service.startup_maintenance()
    thesis_generation_service.migrate_reference_prompts_and_cleanup_uploads()
    Thread(target=_reference_upload_maintenance_loop, daemon=True).start()
    Thread(target=_prewarm_exact_demo_voice, daemon=True).start()


@app.get("/")
def root():
    return {"message": "MyShortBIZ API is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MyShortBIZ"}


app.include_router(AuthRouter)
app.include_router(ContactRouter)
app.include_router(PricingRouter)
app.include_router(PaymentsRouter)
app.include_router(ContentRouter)
app.include_router(ThesisRouter)
app.include_router(VapiRouter)

for module_path in OPTIONAL_ROUTER_MODULES:
    _include_optional_router(module_path)
