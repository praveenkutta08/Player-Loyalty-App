#!/usr/bin/env bash
# CI drift check: regenerate the typed client and fail if it differs from what's committed, so the
# OpenAPI contract and packages/api-client can never silently diverge (GOLDEN RULE #7).
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

schema="packages/api-client/src/generated/schema.ts"
backup="$(mktemp)"
cp "$schema" "$backup"

bash scripts/regen-api-client.sh >/dev/null

if ! diff -q "$schema" "$backup" >/dev/null; then
  echo "✗ api-client is out of date with the backend OpenAPI." >&2
  echo "  Run 'pnpm gen:api' and commit the regenerated schema." >&2
  diff "$backup" "$schema" | head -40 >&2 || true
  cp "$backup" "$schema" # restore the working tree
  rm -f "$backup"
  exit 1
fi

rm -f "$backup"
echo "✓ api-client is in sync with the backend OpenAPI."
