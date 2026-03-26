from sqlalchemy.orm import Session
from models.ai_usage import AIUsage


def log_ai_usage(
    db: Session,
    user_id: str,
    feature: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    cost_usd: float,
):
    usage = AIUsage(
        user_id=user_id,
        feature=feature,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )
    db.add(usage)
    db.commit()