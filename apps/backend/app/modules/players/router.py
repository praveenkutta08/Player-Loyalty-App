"""Player auth endpoints (separate audience): password + email OTP, plus /players/me."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.logging import get_logger
from ...core.ratelimit import enforce_auth_rate_limit
from ...core.security import AUDIENCE_PLAYER
from ...db.session import get_session
from ...tenancy.deps import TenantSessionDep, get_current_tenant_id
from ..identity.schemas import RefreshRequest, TokenPair
from ..identity.service import issue_token_pair, rotate_refresh_token
from .deps import get_current_player
from .models import Player
from .schemas import PlayerLoginRequest, PlayerMeOut, PlayerOtpRequest, PlayerOtpVerify
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


@router.post("/auth/player/otp/request", status_code=status.HTTP_202_ACCEPTED, tags=["auth"])
async def player_otp_request(
    request: Request, body: PlayerOtpRequest, session: TenantSessionDep, tenant_id: TenantIdDep
) -> dict[str, str]:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "player_otp_request", f"{tenant_id}:{body.email}")
    # Do not reveal whether the email exists; only issue a code if it does.
    player = await get_player_by_email(session, body.email)
    if player is not None:
        code = await create_player_otp(session, tenant_id, body.email)
        # Dev delivery: log the code. Real APNs/FCM/email adapter wires in later.
        logger.info("player_otp_issued", tenant_id=str(tenant_id), email=body.email, code=code)
    return {"status": "sent"}


@router.post("/auth/player/otp/verify", response_model=TokenPair, tags=["auth"])
async def player_otp_verify(
    request: Request, body: PlayerOtpVerify, session: TenantSessionDep, tenant_id: TenantIdDep
) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "player_otp_verify", f"{tenant_id}:{body.email}")
    player = await verify_player_otp(session, body.email, body.code)
    return await issue_token_pair(session, player.id, AUDIENCE_PLAYER, {"tenant": str(tenant_id)})


@router.get("/players/me", response_model=PlayerMeOut, tags=["players"])
async def player_me(player: Annotated[Player, Depends(get_current_player)]) -> PlayerMeOut:
    return PlayerMeOut.model_validate(player)
