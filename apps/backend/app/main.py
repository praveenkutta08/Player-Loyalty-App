"""FastAPI application factory: settings, logging, CORS, RFC 7807 errors, OpenAPI, /health."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.router import api_router
from .core.errors import register_exception_handlers
from .core.logging import configure_logging, get_logger
from .core.middleware import AccessLogMiddleware
from .core.settings import get_settings
from .db.guards import assert_rls_bound_role

# OpenAPI tag metadata — one entry per domain, populated as modules land.
OPENAPI_TAGS = [
    {"name": "health", "description": "Liveness/readiness checks."},
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Fail-closed isolation (audit C1): never serve traffic on a role that bypasses RLS.
    await assert_rls_bound_role()
    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(settings.app_env)
    logger = get_logger("app")

    app = FastAPI(
        title="Player Mobile App API",
        version="0.1.0",
        summary="White-label casino player platform — backend (modular monolith).",
        openapi_tags=OPENAPI_TAGS,
        openapi_url=f"{settings.api_base_path}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AccessLogMiddleware)

    register_exception_handlers(app)

    app.include_router(api_router, prefix=settings.api_base_path)

    @app.get("/health", tags=["health"], summary="Health check")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    logger.info("app_started", env=settings.app_env, api_base_path=settings.api_base_path)
    return app


app = create_app()
