"""Password hashing (argon2) and JWT creation/verification for the two auth audiences.

GOLDEN RULE #6: players (mobile) and admins (console) are separate audiences with separate
tokens. Every token carries an ``aud`` claim (admin/player) and a ``typ`` claim (access/refresh);
decoding validates both, so a player token can never be used on an admin route and vice versa.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error

from .errors import ProblemException
from .settings import get_settings

_hasher = PasswordHasher()

ALGORITHM = "HS256"

AUDIENCE_ADMIN = "admin"
AUDIENCE_PLAYER = "player"

TOKEN_ACCESS = "access"
TOKEN_REFRESH = "refresh"


def hash_password(password: str) -> str:
    """Hash a plaintext password with argon2."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against an argon2 hash."""
    try:
        return _hasher.verify(password_hash, password)
    except Argon2Error:
        return False


def _now() -> datetime:
    return datetime.now(UTC)


def create_token(
    *,
    subject: uuid.UUID | str,
    audience: str,
    token_type: str,
    ttl: timedelta,
    extra_claims: dict[str, Any] | None = None,
    jti: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Encode a signed JWT and return ``(token, payload)``."""
    now = _now()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "aud": audience,
        "typ": token_type,
        "jti": jti or str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGORITHM)
    return token, payload


def create_access_token(
    subject: uuid.UUID | str, audience: str, extra_claims: dict[str, Any] | None = None
) -> tuple[str, dict[str, Any]]:
    settings = get_settings()
    return create_token(
        subject=subject,
        audience=audience,
        token_type=TOKEN_ACCESS,
        ttl=timedelta(minutes=settings.jwt_access_ttl_min),
        extra_claims=extra_claims,
    )


def create_refresh_token(
    subject: uuid.UUID | str, audience: str, extra_claims: dict[str, Any] | None = None
) -> tuple[str, dict[str, Any]]:
    settings = get_settings()
    return create_token(
        subject=subject,
        audience=audience,
        token_type=TOKEN_REFRESH,
        ttl=timedelta(days=settings.jwt_refresh_ttl_days),
        extra_claims=extra_claims,
    )


def decode_token(token: str, *, audience: str, token_type: str) -> dict[str, Any]:
    """Decode and validate a JWT for the given audience and type, or raise 401."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[ALGORITHM],
            audience=audience,
        )
    except jwt.PyJWTError as exc:
        raise ProblemException(401, "Invalid or expired token", detail=str(exc)) from exc

    if payload.get("typ") != token_type:
        raise ProblemException(401, "Invalid token type")
    return payload
