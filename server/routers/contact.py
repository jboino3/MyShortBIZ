from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from .auth import get_current_user, UserOut  # use new auth models

router = APIRouter(
    prefix="/api/contact",
    tags=["contact"],
)

# ------------------------
# In-memory store for now
# ------------------------

CONTACT_MESSAGES: list[dict] = []
NEXT_MESSAGE_ID = 1


# ------------------------
# Pydantic models
# ------------------------

class ContactMessageIn(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactMessageOut(ContactMessageIn):
    id: int
    created_at: datetime


# ------------------------
# Helpers
# ------------------------

def _require_admin(user: UserOut):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


def _serialize(msg: dict) -> ContactMessageOut:
    return ContactMessageOut(
        id=msg["id"],
        name=msg["name"],
        email=msg["email"],
        message=msg["message"],
        created_at=msg["created_at"],
    )


# ------------------------
# Public endpoint
# ------------------------

@router.post("", response_model=ContactMessageOut, status_code=status.HTTP_201_CREATED)
def submit_contact(payload: ContactMessageIn):
    """
    Public: submit a contact message.
    """
    global NEXT_MESSAGE_ID

    msg = {
        "id": NEXT_MESSAGE_ID,
        "name": payload.name,
        "email": payload.email,
        "message": payload.message,
        "created_at": datetime.utcnow(),
    }
    NEXT_MESSAGE_ID += 1
    CONTACT_MESSAGES.append(msg)

    return _serialize(msg)


# ------------------------
# Admin-only endpoint
# ------------------------

@router.get("", response_model=List[ContactMessageOut])
def list_contact_messages(current_user: UserOut = Depends(get_current_user)):
    """
    Admin: list all contact messages.
    """
    _require_admin(current_user)
    return [_serialize(m) for m in CONTACT_MESSAGES]
