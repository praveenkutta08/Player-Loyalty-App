"""Application settings, loaded from the environment / .env via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration.

    Field names map to UPPER_SNAKE_CASE env vars (see the repo-root ``.env.example``). Unknown
    env vars are ignored so the shared ``.env`` can carry frontend/adapter keys too.
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core
    app_env: str = "dev"
    api_base_path: str = "/api/v1"

    # Infra (used from later phases; declared now so config is complete)
    database_url: str = "postgresql+asyncpg://player:player@localhost:5432/player"
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "change-me-dev-only"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30

    # Adapters (mock | sandbox | live) — MVP default = mock
    adapter_mode: str = "mock"

    # CORS — the admin console dev origin (Vite default port).
    cors_origins: list[str] = ["http://localhost:5173"]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local"}


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
