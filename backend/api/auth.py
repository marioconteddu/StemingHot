"""Simple optional auth: env STEMINGHOT_USER + STEMINGHOT_PASSWORD enable login; JWT for API."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Request
from pydantic import BaseModel

# When set, login is required for all /api/* except /api/health and /api/auth/login
AUTH_USER = os.environ.get("STEMINGHOT_USER", "").strip()
AUTH_PASSWORD = os.environ.get("STEMINGHOT_PASSWORD", "").strip()
JWT_SECRET = os.environ.get("STEMINGHOT_JWT_SECRET", AUTH_PASSWORD or "steminghot-insecure")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24 * 7  # 7 days


def auth_enabled() -> bool:
    return bool(AUTH_USER and AUTH_PASSWORD)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


def verify_credentials(username: str, password: str) -> bool:
    return auth_enabled() and username == AUTH_USER and password == AUTH_PASSWORD


def create_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None


def get_bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth[7:].strip()
