from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User
from models.video_job import VideoJob
from routers.auth import get_current_user
from schemas.ai_video import VideoGenerateRequest, VideoGenerateResponse, VideoJobOut
from schemas.video_prompt_builder import VideoPromptBuildRequest
from services.runway_service import (
    create_video_task,
    get_video_task,
    RunwayNotConfiguredError,
)
from services.video_prompt_builder_service import build_video_prompt_package

router = APIRouter(prefix="/ai/video", tags=["AI Video"])


@router.post("/generate", response_model=VideoGenerateResponse)
def generate_video(
    req: VideoGenerateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    final_prompt = req.prompt

    # If no direct prompt was provided, build one from structured inputs
    if not final_prompt:
        if not req.topic:
            raise HTTPException(
                status_code=400,
                detail="Provide either 'prompt' or structured inputs including 'topic'.",
            )

        prompt_build_req = VideoPromptBuildRequest(
            topic=req.topic,
            product_name=req.product_name,
            product_type=req.product_type,
            target_audience=req.target_audience,
            platform=req.platform,
            tone=req.tone,
            goal=req.goal,
            call_to_action=req.call_to_action,
            visual_style=req.visual_style,
            duration_seconds=req.duration,
            aspect_ratio=req.ratio,
            extra_context=req.extra_context,
        )

        payload, _tokens_used = build_video_prompt_package(prompt_build_req, db, user)
        final_prompt = payload.get("runway_prompt")

        if not final_prompt:
            raise HTTPException(status_code=500, detail="Failed to build video prompt.")

    try:
        runway_task = create_video_task(
            prompt=final_prompt,
            prompt_image=str(req.prompt_image) if req.prompt_image else None,
            ratio=req.ratio,
            duration=req.duration,
        )
    except RunwayNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    job = VideoJob(
        user_id=user.id,
        provider="runway",
        provider_job_id=runway_task["id"],
        prompt=final_prompt,
        prompt_image=str(req.prompt_image) if req.prompt_image else None,
        model="gen4.5",
        ratio=req.ratio,
        duration=req.duration,
        status=(runway_task["status"] or "PENDING").lower(),
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return VideoGenerateResponse(
        id=job.id,
        provider=job.provider,
        model=job.model,
        status=job.status,
        provider_job_id=job.provider_job_id,
        final_prompt=final_prompt,
    )


@router.get("/my", response_model=list[VideoJobOut])
def list_my_video_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    jobs = (
        db.query(VideoJob)
        .filter(VideoJob.user_id == current_user.id)
        .order_by(VideoJob.created_at.desc())
        .all()
    )
    return jobs


@router.get("/{job_id}", response_model=VideoJobOut)
def get_video_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
    return job


@router.post("/{job_id}/refresh", response_model=VideoJobOut)
def refresh_video_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")

    if not job.provider_job_id:
        raise HTTPException(status_code=400, detail="Missing provider job id")

    try:
        task = get_video_task(job.provider_job_id)
    except RunwayNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    status_map = {
        "PENDING": "pending",
        "RUNNING": "processing",
        "THROTTLED": "processing",
        "SUCCEEDED": "completed",
        "FAILED": "failed",
        "CANCELED": "canceled",
    }

    job.status = status_map.get(task["status"], str(task["status"]).lower())

    if task["output_url"]:
        job.output_url = task["output_url"]
    if task["thumbnail_url"]:
        job.thumbnail_url = task["thumbnail_url"]

    if task["failure_message"]:
        job.error_message = task["failure_message"]
    elif task["failure_code"]:
        job.error_message = task["failure_code"]

    db.commit()
    db.refresh(job)
    return job