from pydantic import BaseModel
from typing import List, Optional


class CVExperience(BaseModel):
    title: str
    company: str
    start_date: str
    end_date: str
    description: str


class CVEducation(BaseModel):
    school: str
    degree: str
    start_date: str
    end_date: str


class CVProject(BaseModel):
    name: str
    description: str


class CVGenerateRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    skills: List[str]
    experience: List[CVExperience]
    education: List[CVEducation]
    projects: Optional[List[CVProject]] = []


class CVGenerateResponse(BaseModel):
    content_markdown: str
    tokens_used: int
    tokens_remaining: int