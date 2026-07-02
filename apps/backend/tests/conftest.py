"""Shared pytest fixtures."""

from __future__ import annotations

import os

# Tests seed fixture data as the DB owner (bypassing RLS), so force the owner engine regardless
# of any local PG_APP_USER override, and permit the superuser connection the app otherwise
# refuses at boot (audit C1). Must happen before any `app.*` import caches Settings.
os.environ["ALLOW_SUPERUSER_DB"] = "1"
os.environ["PG_APP_USER"] = ""
os.environ["PG_APP_PASSWORD"] = ""

from collections.abc import AsyncIterator, Iterator  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncEngine  # noqa: E402


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def db_engine() -> AsyncIterator[AsyncEngine]:
    """Yield the app's async engine and dispose its pool after the test.

    pytest-asyncio runs each test in its own event loop; disposing here (inside that loop) prevents
    the module-level engine's pooled connections from leaking across loops.
    """
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def api(db_engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    """Async HTTP client that drives the ASGI app in the current event loop."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client
