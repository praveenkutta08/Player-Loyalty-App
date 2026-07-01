"""In-memory mock KycPort. Deterministic: names containing 'reject' fail, 'review' → manual."""

from __future__ import annotations

from ...ports.errors import AdapterNotFoundError
from ...ports.kyc import KycSession, KycStatus
from .base import MockAdapterBase


class MockKycAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        self._sessions: dict[str, KycSession] = {}

    def _decide(self, full_name: str) -> KycStatus:
        lowered = full_name.lower()
        if "reject" in lowered:
            return KycStatus.rejected
        if "review" in lowered:
            return KycStatus.review
        return KycStatus.approved

    async def start_verification(
        self, player_ref: str, full_name: str, document_ref: str
    ) -> KycSession:
        await self._simulate()
        session = KycSession(
            id=self._new_id(), player_ref=player_ref, status=self._decide(full_name)
        )
        self._sessions[session.id] = session
        return session

    async def get_status(self, session_id: str) -> KycSession:
        await self._simulate()
        session = self._sessions.get(session_id)
        if session is None:
            raise AdapterNotFoundError(f"unknown session {session_id}")
        return session
