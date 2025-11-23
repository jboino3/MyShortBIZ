from pydantic import BaseModel
from typing import List, Optional


class PlanCreate(BaseModel):
    code: str                      # unique ID like "starter"
    name: str
    description: Optional[str] = None
    price_usd: float
    billing_interval: str = "monthly"
    is_active: bool = True
    features: List[str] = []


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_usd: Optional[float] = None
    billing_interval: Optional[str] = None
    is_active: Optional[bool] = None
    features: Optional[List[str]] = None


class PlanOut(PlanCreate):
    pass
