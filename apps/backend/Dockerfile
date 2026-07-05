# Backend API image — FastAPI + uv (Python 3.13).
# Build context = apps/backend  (docker build -f apps/backend/Dockerfile apps/backend)
FROM python:3.13-slim

# uv for dependency management (matches local/CI toolchain).
RUN pip install --no-cache-dir uv

WORKDIR /app

# Install deps first for layer caching.
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev || uv sync --no-dev

# App source.
COPY . .

# Non-dev by default so the production-safety guard (M5) is active. Override per environment.
ENV APP_ENV=production
EXPOSE 8000

# Run migrations (idempotent) then serve. $PORT is provided by most hosts (Render/Railway/Fly);
# defaults to 8000 locally. Seeding is a separate one-off command (see docs/DEPLOYMENT.md).
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
