#!/usr/bin/env bash
# Regenerate the canonical OpenAPI snapshot + typed client from the FastAPI app (GOLDEN RULE #7).
# Dumps the schema straight from the app object — no running server or database needed.
#
# apps/backend/openapi.json is the committed, human-readable contract snapshot (M7); it and the
# generated TS client are both drift-checked in CI so neither can silently go stale.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

spec="apps/backend/openapi.json"

echo "→ Exporting OpenAPI from the FastAPI app…"
# Write the file from Python (not a stdout redirect) so app-startup logs don't pollute it, with
# LF newlines + sorted keys for a stable cross-platform diff.
( cd apps/backend && uv run python -c "import json; from app.main import app; f=open('../../$spec','w',encoding='utf-8',newline='\n'); f.write(json.dumps(app.openapi(), indent=2, sort_keys=True)+'\n'); f.close()" )

echo "→ Generating typed client…"
pnpm --filter @repo/api-client exec openapi-typescript "../../$spec" --output src/generated/schema.ts

echo "✓ apps/backend/openapi.json + packages/api-client/src/generated/schema.ts regenerated."
