#!/usr/bin/env bash
# CI drift check: regenerate the OpenAPI snapshot + typed client and fail if either differs from
# what's committed, so the contract, apps/backend/openapi.json, and packages/api-client can never
# silently diverge (GOLDEN RULE #7, M7).
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

schema="packages/api-client/src/generated/schema.ts"
spec="apps/backend/openapi.json"

backup_schema="$(mktemp)"
backup_spec="$(mktemp)"
cp "$schema" "$backup_schema"
cp "$spec" "$backup_spec"

bash scripts/regen-api-client.sh >/dev/null

status=0
for pair in "$schema:$backup_schema" "$spec:$backup_spec"; do
  file="${pair%%:*}"
  backup="${pair##*:}"
  if ! diff -q "$file" "$backup" >/dev/null; then
    echo "✗ $file is out of date with the backend OpenAPI." >&2
    diff "$backup" "$file" | head -40 >&2 || true
    status=1
  fi
done

# Restore the working tree to the committed versions regardless of outcome.
cp "$backup_schema" "$schema"
cp "$backup_spec" "$spec"
rm -f "$backup_schema" "$backup_spec"

if [ "$status" -ne 0 ]; then
  echo "  Run 'pnpm gen:api' and commit the regenerated files." >&2
  exit 1
fi
echo "✓ OpenAPI snapshot + api-client are in sync with the backend."
