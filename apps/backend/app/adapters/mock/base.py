"""Shared behaviour for mock adapters: simulated latency and occasional transient failures.

Defaults come from settings (``mock_latency_ms`` / ``mock_failure_rate``). Both default to 0 so
contract tests are deterministic; set a failure rate in dev to exercise retry/resilience paths.
The RNG is seedable per instance for reproducibility.
"""

from __future__ import annotations

import asyncio
import random
import uuid

from ...core.settings import get_settings
from ...ports.errors import AdapterUnavailableError


class MockAdapterBase:
    def __init__(
        self,
        *,
        latency_ms: int | None = None,
        failure_rate: float | None = None,
        seed: int | None = None,
    ) -> None:
        settings = get_settings()
        self._latency_ms = settings.mock_latency_ms if latency_ms is None else latency_ms
        self._failure_rate = settings.mock_failure_rate if failure_rate is None else failure_rate
        self._rng = random.Random(seed)
        self._init_state()

    def _init_state(self) -> None:
        """Hook for subclasses to initialise in-memory stores."""

    async def _simulate(self) -> None:
        """Apply configured latency and maybe raise a transient failure."""
        if self._latency_ms > 0:
            await asyncio.sleep(self._latency_ms / 1000)
        if self._failure_rate > 0 and self._rng.random() < self._failure_rate:
            raise AdapterUnavailableError("mock: simulated transient provider failure")

    @staticmethod
    def _new_id() -> str:
        return uuid.uuid4().hex
