import sys

sys.path.insert(0, "/home/anya/MyShortBIZ/server")

from db import SessionLocal
from services.phone_speech_service import normalize_phone_tts_text
from services.telephony_session_service import telephony_session_service
from services.thesis_agent_service import thesis_agent_service
from services.thesis_voice_service import thesis_voice_service


def main():
    db = SessionLocal()
    try:
        context = telephony_session_service.build_call_context(db)
    finally:
        db.close()

    agent_config = context.get("agent_config", {})
    phone_config = context.get("phone_config", {})
    business_name = agent_config.get("business_name", "MyShortBIZ")
    user_id = context.get("user_id")
    prompt_path = context.get("voice_prompt_path")
    variant = thesis_voice_service.conversation_model_variant

    if not user_id or not prompt_path:
        raise SystemExit("No telephony voice context is available for warmup.")

    replies: list[str] = list(
        dict.fromkeys(
            thesis_agent_service.warmup_replies(
                agent_config=agent_config,
                phone_config=phone_config,
                business_name=business_name,
            )
        )
    )

    unique_replies = list(dict.fromkeys(reply for reply in replies if reply))
    for index, reply in enumerate(unique_replies, start=1):
        thesis_voice_service.generate_phone_pcm_local(
            user_id,
            prompt_path,
            normalize_phone_tts_text(reply),
            8000,
            thesis_voice_service.conversation_model_variant,
        )
        print(f"[{index}/{len(unique_replies)}] warmed {reply}", flush=True)


if __name__ == "__main__":
    main()
