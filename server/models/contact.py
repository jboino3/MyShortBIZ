from pydantic import BaseModel, EmailStr
from datetime import datetime

class Contact(BaseModel):
    id: str
    name: str
    email: EmailStr
    subject: str
    message: str
    submitted_at: datetime
