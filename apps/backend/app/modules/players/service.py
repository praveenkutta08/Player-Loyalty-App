"""Player auth services: password + email OTP. All queries run under the tenant's RLS context."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.security import hash_password, verify_password
from .models import Player, PlayerOtp

OTP_TTL_MINUTES = 10
OTP_LENGTH = 6


async def get_player_by_email(session: AsyncSession, email: str) -> Player | None:
    """Look up a player by email within the current tenant (RLS-scoped)."""
    return (
        await session.execute(select(Player).where(Player.email == email.lower()))
    ).scalar_one_or_none()


async def authenticate_player_password(session: AsyncSession, email: str, password: str) -> Player:
    player = await get_player_by_email(session, email)
    if (
        player is None
        or player.password_hash is None
        or not verify_password(password, player.password_hash)
    ):
        raise ProblemException(401, "Invalid credentials")
    return player


async def create_player_otp(session: AsyncSession, tenant_id: UUID, email: str) -> str:
    """Create and store a one-time code (hashed); return the plaintext for delivery."""
    code = f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"
    session.add(
        PlayerOtp(
            tenant_id=tenant_id,
            email=email.lower(),
            code_hash=hash_password(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=OTP_TTL_MINUTES),
        )
    )
    await session.flush()
    return code


async def verify_player_otp(session: AsyncSession, email: str, code: str) -> Player:
    """Verify a live OTP for the email, consume it, and return the player."""
    now = datetime.now(UTC)
    otp = (
        (
            await session.execute(
                select(PlayerOtp)
                .where(
                    PlayerOtp.email == email.lower(),
                    PlayerOtp.consumed_at.is_(None),
                    PlayerOtp.expires_at > now,
                )
                .order_by(PlayerOtp.created_at.desc())
                .limit(1)
            )
        )
        .scalars()
        .first()
    )

    if otp is None or not verify_password(code, otp.code_hash):
        raise ProblemException(401, "Invalid or expired code")

    otp.consumed_at = now
    player = await get_player_by_email(session, email)
    if player is None:
        raise ProblemException(401, "Invalid or expired code")
    return player
