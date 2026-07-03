"""Auth services: admin authentication and audience-generic token issue/rotation."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, update
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
    *,
    family_id: UUID | None = None,
) -> TokenPair:
    """Mint an access+refresh pair and record the refresh jti for rotation/revocation.

    A fresh login starts a new token family; ``rotate_refresh_token`` passes the existing
    ``family_id`` forward so reuse of any member can revoke the whole lineage (M1).
    """
    access_token, _ = create_access_token(subject_id, audience, extra_claims)
    refresh_token, payload = create_refresh_token(subject_id, audience, extra_claims)
    session.add(
        RefreshToken(
            jti=UUID(payload["jti"]),
            subject_id=subject_id,
            audience=audience,
            family_id=family_id or uuid4(),
            expires_at=datetime.fromtimestamp(payload["exp"], tz=UTC),
        )
    )
    await session.flush()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


async def _revoke_family(session: AsyncSession, family_id: UUID) -> None:
    """Revoke every still-live token in a family (reuse-detection theft response)."""
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


async def rotate_refresh_token(
    session: AsyncSession,
    refresh_token: str,
    audience: str,
    extra_claims_from_payload: Callable[[dict[str, Any]], dict[str, Any] | None] | None = None,
) -> TokenPair:
    """Validate a refresh token, atomically revoke it, and issue a fresh pair (rotation, M1).

    The revoke is a single ``UPDATE ... WHERE revoked_at IS NULL RETURNING`` so two concurrent
    requests can't both win. If the atomic revoke matches nothing but the row exists, the token
    was already rotated — treat that as reuse (a stolen/replayed token) and revoke the whole
    family so neither the thief's nor the victim's lineage survives.
    """
    payload = decode_token(refresh_token, audience=audience, token_type=TOKEN_REFRESH)
    jti = UUID(payload["jti"])
    subject_id = UUID(payload["sub"])

    now = datetime.now(UTC)
    family_id = (
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.jti == jti, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
            .returning(RefreshToken.family_id)
        )
    ).scalar_one_or_none()

    if family_id is None:
        # Either unknown jti, or a known-but-already-revoked token (reuse).
        row = (
            await session.execute(select(RefreshToken).where(RefreshToken.jti == jti))
        ).scalar_one_or_none()
        if row is not None:
            await _revoke_family(session, row.family_id)
            # Persist the revocation BEFORE raising — the 401 below triggers a request-level
            # rollback, which would otherwise undo the theft response.
            await session.commit()
            raise ProblemException(
                401,
                "Refresh token reuse detected",
                detail="This session has been revoked; please sign in again.",
            )
        raise ProblemException(401, "Invalid or already-used refresh token")

    extra = extra_claims_from_payload(payload) if extra_claims_from_payload else None
    return await issue_token_pair(session, subject_id, audience, extra, family_id=family_id)


async def revoke_refresh_token(session: AsyncSession, refresh_token: str, audience: str) -> None:
    """Logout: revoke the presented token's whole family. Idempotent — an unknown/expired token
    is treated as already-logged-out (no error), so a stale client can always sign out cleanly."""
    try:
        payload = decode_token(refresh_token, audience=audience, token_type=TOKEN_REFRESH)
    except ProblemException:
        return
    row = (
        await session.execute(
            select(RefreshToken).where(RefreshToken.jti == UUID(payload["jti"]))
        )
    ).scalar_one_or_none()
    if row is not None:
        await _revoke_family(session, row.family_id)
        await session.flush()
