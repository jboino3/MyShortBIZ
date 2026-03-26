from openai import OpenAI
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens
from models import User
from schemas.ai_cv import CVGenerateRequest

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4.1-mini"


def build_cv_prompt(req: CVGenerateRequest) -> str:
    return f"""
You are a professional resume writer.

Create a clean, professional resume in Markdown format.

Name: {req.full_name}
Email: {req.email}
Phone: {req.phone}

Skills:
{", ".join(req.skills)}

Work Experience:
{chr(10).join([f"{e.title} at {e.company} ({e.start_date} - {e.end_date}): {e.description}" for e in req.experience])}

Education:
{chr(10).join([f"{e.degree} at {e.school} ({e.start_date} - {e.end_date})" for e in req.education])}

Projects:
{chr(10).join([f"{p.name}: {p.description}" for p in req.projects])}

Format:
- Use headings
- Keep it ATS friendly
- Use bullet points
- Make it professional
- Output ONLY Markdown
"""


def generate_cv(req: CVGenerateRequest, db: Session, user: User):
    prompt = build_cv_prompt(req)

    resp = client.responses.create(
        model=MODEL,
        input=prompt,
    )

    text = resp.output_text

    # Usage tracking
    usage = resp.usage
    prompt_tokens = usage.input_tokens
    completion_tokens = usage.output_tokens
    total_tokens = usage.total_tokens

    cost_usd = total_tokens * 0.000002

    log_ai_usage(
        db=db,
        user_id=user.id,
        feature="cv",
        model=MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )

    # Deduct tokens
    platform_tokens = calculate_platform_tokens(total_tokens)
    user.tokens_remaining -= platform_tokens
    db.commit()

    return text, platform_tokens