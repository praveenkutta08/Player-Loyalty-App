"""Player auth endpoints (separate audience): password + email OTP, plus /players/me."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.logging import get_logger
from ...core.ratelimit import enforce_auth_rate_limit
from ...core.security import AUDIENCE_PLAYER
from ...core.settings import get_settings
from ...db.session import get_session
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ...tenancy.deps import TenantSessionDep, get_current_tenant_id, require_active_tenant
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..identity.schemas import RefreshRequest, TokenPair
from ..identity.service import issue_token_pair, revoke_refresh_token, rotate_refresh_token
from .deps import get_current_player
from .models import Player
from .schemas import (
    PlayerLoginRequest,
    PlayerMeOut,
    PlayerOtpRequest,
    PlayerOtpVerify,
    PlayerRgOut,
    RgFlagsUpdate,
)
from .service import (
    authenticate_player_password,
    create_player_otp,
    get_player_by_email,
    verify_player_otp,
)

router = APIRouter()
logger = get_logger("players.auth")

TenantIdDep = Annotated[UUID, Depends(get_current_tenant_id)]


@router.post("/auth/player/login", response_model=TokenPair, tags=["auth"])
async def player_login(
    request: Request, body: PlayerLoginRequest, session: TenantSessionDep, tenant_id: TenantIdDep
) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "player_login", f"{tenant_id}:{body.email}")
    await require_active_tenant(session, tenant_id)  # M4: suspended tenants cannot auth
    player = await authenticate_player_password(session, body.email, body.password)
    return await issue_token_pair(session, player.id, AUDIENCE_PLAYER, {"tenant": str(tenant_id)})


@router.post("/auth/player/refresh", response_model=TokenPair, tags=["auth"])
async def player_refresh(
    body: RefreshRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    # Refresh only touches the global refresh_tokens table (no tenant context needed);
    # the tenant claim is carried over from the old token.
    return await rotate_refresh_token(
        session,
        body.refresh_token,
        AUDIENCE_PLAYER,
        lambda payload: {"tenant": payload["tenant"]} if payload.get("tenant") else None,
    )


@router.post("/auth/player/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def player_logout(
    body: RefreshRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> None:
    # audit: exempt — session teardown, not a privileged mutation. Revokes the token family (M1).
    await revoke_refresh_token(session, body.refresh_token, AUDIENCE_PLAYER)


@router.post("/auth/player/otp/request", status_code=status.HTTP_202_ACCEPTED, tags=["auth"])
async def player_otp_request(
    request: Request, body: PlayerOtpRequest, session: TenantSessionDep, tenant_id: TenantIdDep
) -> dict[str, str]:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "player_otp_request", f"{tenant_id}:{body.email}")
    await require_active_tenant(session, tenant_id)  # M4: suspended tenants cannot auth
    # Do not reveal whether the email exists; only issue a code if it does.
    player = await get_player_by_email(session, body.email)
    if player is not None:
        code = await create_player_otp(session, tenant_id, body.email)
        # Never log the plaintext code outside dev (M3). Dev logs it as the delivery channel
        # until a real APNs/FCM/email adapter lands; prod logs only that a code was issued.
        if get_settings().is_dev:
            logger.info("player_otp_issued", tenant_id=str(tenant_id), email=body.email, code=code)
        else:
            logger.info("player_otp_issued", tenant_id=str(tenant_id))
    return {"status": "sent"}


@router.post("/auth/player/otp/verify", response_model=TokenPair, tags=["auth"])
async def player_otp_verify(
    request: Request, body: PlayerOtpVerify, session: TenantSessionDep, tenant_id: TenantIdDep
) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "player_otp_verify", f"{tenant_id}:{body.email}")
    await require_active_tenant(session, tenant_id)  # M4: suspended tenants cannot auth
    player = await verify_player_otp(session, body.email, body.code)
    return await issue_token_pair(session, player.id, AUDIENCE_PLAYER, {"tenant": str(tenant_id)})


@router.get("/players/me", response_model=PlayerMeOut, tags=["players"])
async def player_me(player: Annotated[Player, Depends(get_current_player)]) -> PlayerMeOut:
    return PlayerMeOut.model_validate(player)


# ------------------------------------------------------------- admin: responsible gaming (H2)
@router.get(
    "/players/rg-flagged",
    response_model=list[PlayerRgOut],
    tags=["players"],
    dependencies=[Depends(require(Permission.players_read.value))],
)
async def list_rg_flagged_players(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[PlayerRgOut]:
    """Players with any active RG flag — backs the Compliance ▸ Responsible Gaming tab."""
    players = (
        (
            await session.execute(
                select(Player).where(Player.rg_flags.is_not(None)).order_by(Player.email)
            )
        )
        .scalars()
        .all()
    )
    return [PlayerRgOut.model_validate(p) for p in players]


@router.get(
    "/players/lookup",
    response_model=PlayerRgOut,
    tags=["players"],
    dependencies=[Depends(require(Permission.players_read.value))],
)
async def lookup_player(
    email: str, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> PlayerRgOut:
    """Find a player by email within the acting tenant (RG tab lookup)."""
    player = (
        await session.execute(select(Player).where(Player.email == email.lower()))
    ).scalar_one_or_none()
    if player is None:
        raise ProblemException(404, "Player not found")
    return PlayerRgOut.model_validate(player)


@router.patch("/players/{player_id}/rg-flags", response_model=PlayerRgOut, tags=["players"])
async def set_player_rg_flags(
    player_id: UUID,
    body: RgFlagsUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.players_rg_update.value))],
) -> PlayerRgOut:
    """Set/clear a player's responsible-gaming flags — permission-gated and audited (H2).

    The concierge guardrail and player-facing flows read these flags; an all-clear body
    removes them.
    """
    player = await session.get(Player, player_id)
    if player is None:
        raise ProblemException(404, "Player not found")
    previous = player.rg_flags or {}
    player.rg_flags = body.to_flags()
    await session.flush()
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="player:rg_flags_update",
        entity="player",
        entity_id=player.id,
        meta={
            "self_exclusion": body.self_exclusion,
            "cool_off_until": (
                body.cool_off_until.isoformat() if body.cool_off_until else None
            ),
            "has_limits": bool(body.limits),
            "had_flags_before": bool(previous),
        },
    )
    return PlayerRgOut.model_validate(player)
