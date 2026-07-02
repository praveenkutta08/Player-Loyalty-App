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
    database_url: str = "postgresql+asyncpg://player:player@localhost:5433/player"
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "dev-only-insecure-change-me-32bytes-minimum"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30

    # Adapters (mock | sandbox | live) — MVP default = mock
    adapter_mode: str = "mock"
    # Per-port provider overrides; fall back to adapter_mode when unset.
    loyalty_provider: str | None = None
    cashless_provider: str | None = None
    digital_key_provider: str | None = None
    kyc_provider: str | None = None
    geo_provider: str | None = None
    payment_provider: str | None = None
    push_provider: str | None = None
    chat_provider: str | None = None
    # Concierge external context (P6.1): "mock" or "real" (Open-Meteo / OSRM, both keyless).
    weather_provider: str | None = None
    travel_provider: str | None = None
    # Concierge narration (P6.3): "mock" = scripted (offline demo), "real" = Claude by env.
    llm_provider: str | None = None
    anthropic_api_key: str | None = None
    llm_model: str = "claude-sonnet-5"
    # Mock adapter behaviour (0 = deterministic; raise in dev to exercise resilience).
    mock_latency_ms: int = 0
    mock_failure_rate: float = 0.0

    # Cache (P6.1) — redis (docker-compose) with graceful degradation, or in-process memory.
    cache_backend: str = "redis"
    weather_cache_ttl_s: int = 1800  # 30 min
    travel_cache_ttl_s: int = 300  # 5 min
    concierge_answer_cache_ttl_s: int = 300  # 5 min per (player, use_case, context_hash)

    # Object storage (MinIO in dev)
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "player-media"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"

    # CORS — the admin console dev origin (Vite default port).
    cors_origins: list[str] = ["http://localhost:5173"]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local"}


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
