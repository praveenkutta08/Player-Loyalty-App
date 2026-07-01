"""Auth services: admin authentication and audience-generic token issue/rotation."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.security import (
    TOKEN_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from .models import AdminUser, RefreshToken
from .schemas import TokenPair


async def authenticate_admin(session: AsyncSession, email: str, password: str) -> AdminUser:
    """Return the admin for valid credentials, or raise 401."""
    user = (
        await session.execute(select(AdminUser).where(AdminUser.email == email.lower()))
    ).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise ProblemException(401, "Invalid credentials")
    return user


async def issue_token_pair(
    session: AsyncSession,
    subject_id: UUID,
    audience: str,
    extra_claims: dict[str, Any] | None = None,
) -> TokenPair:
    """Mint an access+refresh pair and record the refresh jti for rotation/revocation."""
    access_token, _ = create_access_token(subject_id, audience, extra_claims)
    refresh_token, payload = create_refresh_token(subject_id, audience, extra_claims)
    session.add(
        RefreshToken(
            jti=UUID(payload["jti"]),
            subject_id=subject_id,
            audience=audience,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=UTC),
        )
    )
    await session.flush()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


async def rotate_refresh_token(
    session: AsyncSession,
    refresh_token: str,
    audience: str,
    extra_claims_from_payload: Callable[[dict[str, Any]], dict[str, Any] | None] | None = None,
) -> TokenPair:
    """Validate a refresh token, revoke it, and issue a fresh pair (rotation)."""
    payload = decode_token(refresh_token, audience=audience, token_type=TOKEN_REFRESH)
    jti = UUID(payload["jti"])
    subject_id = UUID(payload["sub"])

    row = (
        await session.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    ).scalar_one_or_none()
    if row is None or row.revoked_at is not None:
        raise ProblemException(401, "Invalid or already-used refresh token")

    row.revoked_at = datetime.now(UTC)
    extra = extra_claims_from_payload(payload) if extra_claims_from_payload else None
    return await issue_token_pair(session, subject_id, audience, extra)
