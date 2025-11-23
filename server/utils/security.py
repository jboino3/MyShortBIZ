import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import JWTError, jwt

# ---------- Password hashing ----------

_PW_SALT = os.getenv("MYSHORTBIZ_PW_SALT", "dev-secret-change-me")


def hash_password(password: str) -> str:
    """
    Very simple HMAC-SHA256 password hashing.
    Good enough for dev; we can switch to bcrypt later.
    """
    return hmac.new(_PW_SALT.encode(), password.encode(), hashlib.sha256).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


# ---------- JWT settings ----------

SECRET_KEY = os.getenv("MYSHORTBIZ_JWT_SECRET", "dev-jwt-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token with an expiration.
    `data` should at least contain a 'sub' field (subject, e.g. user id).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT. Raises ValueError if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e
