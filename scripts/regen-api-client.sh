#!/usr/bin/env bash
# Regenerate packages/api-client from the backend's OpenAPI contract (GOLDEN RULE #7).
# Dumps the schema straight from the FastAPI app object — no running server or database needed.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

echo "→ Exporting OpenAPI from the FastAPI app…"
( cd apps/backend && uv run python -c "import json; from app.main import app; open('../../openapi.json','w',encoding='utf-8').write(json.dumps(app.openapi()))" >/dev/null )

echo "→ Generating typed client…"
pnpm --filter @repo/api-client exec openapi-typescript ../../openapi.json --output src/generated/schema.ts

rm -f "$repo_root/openapi.json"
echo "✓ packages/api-client/src/generated/schema.ts regenerated."
