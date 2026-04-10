import os
from typing import Any, Optional

from dotenv import load_dotenv

load_dotenv()

RUNWAY_API_KEY = os.getenv("RUNWAY_API_KEY", "")
RUNWAY_MODEL = os.getenv("RUNWAY_MODEL", "gen4.5")
RUNWAY_ENABLED = os.getenv("RUNWAY_ENABLED", "false").lower() == "true"


class RunwayNotConfiguredError(Exception):
    pass


def _get_client():
    if not RUNWAY_ENABLED or not RUNWAY_API_KEY:
        raise RunwayNotConfiguredError(
            "Runway is not configured yet. Add RUNWAY_API_KEY and set RUNWAY_ENABLED=true."
        )

    from runwayml import RunwayML
    return RunwayML(api_key=RUNWAY_API_KEY)


def create_video_task(
    prompt: str,
    ratio: str = "1280:720",
    duration: int = 5,
    prompt_image: Optional[str] = None,
    model: Optional[str] = None,
) -> dict[str, Any]:
    client = _get_client()
    chosen_model = model or RUNWAY_MODEL

    if prompt_image:
        task = client.image_to_video.create(
            model=chosen_model,
            prompt_image=prompt_image,
            prompt_text=prompt,
            ratio=ratio,
            duration=duration,
        )
    else:
        task = client.text_to_video.create(
            model=chosen_model,
            prompt_text=prompt,
            ratio=ratio,
            duration=duration,
        )

    return {
        "id": getattr(task, "id", None),
        "status": getattr(task, "status", "PENDING"),
        "raw": task,
    }


def get_video_task(task_id: str) -> dict[str, Any]:
    client = _get_client()
    task = client.tasks.retrieve(task_id)

    output = getattr(task, "output", None)

    output_url = None
    thumbnail_url = None

    if isinstance(output, list) and output:
        first = output[0]
        if isinstance(first, dict):
            output_url = first.get("url")
            thumbnail_url = first.get("thumbnailUrl") or first.get("thumbnail_url")

    return {
        "id": getattr(task, "id", None),
        "status": getattr(task, "status", None),
        "failure_code": getattr(task, "failure_code", None),
        "failure_message": getattr(task, "failure_message", None),
        "output_url": output_url,
        "thumbnail_url": thumbnail_url,
        "raw": task,
    }