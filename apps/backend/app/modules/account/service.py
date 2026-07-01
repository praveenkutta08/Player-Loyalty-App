"""Account/loyalty services: profile, points, activity (via LoyaltyPort), devices, KYC."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...ports.kyc import KycPort
from ...ports.loyalty import LoyaltyActivity, LoyaltyPort
from ...ports.push import Platform, PushPort
from ..players.models import Device, Player


async def register_device(
    session: AsyncSession, push: PushPort, player: Player, platform: str, push_token: str
) -> Device:
    """Upsert a player device and register it with the push provider."""
    existing = (
        await session.execute(
            select(Device).where(
                Device.tenant_id == player.tenant_id, Device.push_token == push_token
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.player_id = player.id
        existing.platform = platform
        existing.last_seen = datetime.now(UTC)
        device = existing
    else:
        device = Device(
            tenant_id=player.tenant_id,
            player_id=player.id,
            platform=platform,
            push_token=push_token,
            last_seen=datetime.now(UTC),
        )
        session.add(device)
    await session.flush()
    await push.register_device(str(player.id), push_token, Platform(platform))
    return device


async def get_activity(loyalty: LoyaltyPort, player: Player) -> list[LoyaltyActivity]:
    return await loyalty.get_activity(str(player.id))


async def start_kyc(session: AsyncSession, kyc: KycPort, player: Player) -> str:
    """Kick off KYC via the port and persist the resulting status on the player."""
    session_ = await kyc.start_verification(str(player.id), player.email, document_ref="mock-doc")
    player.kyc_status = session_.status.value
    await session.flush()
    return player.kyc_status
