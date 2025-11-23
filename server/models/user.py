from pydantic import BaseModel, EmailStr
from typing import Optional


class UserInDB(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    hashed_password: str
    role: str = "user"   # "user" or "admin"
