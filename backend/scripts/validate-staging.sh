#!/usr/bin/env bash
# Smoke-check a deployed staging or production API (requires curl).
# Usage: STAGING_URL=https://your-api.onrender.com ./scripts/validate-staging.sh
set -euo pipefail
BASE="${STAGING_URL:-}"
if [[ -z "$BASE" ]]; then
  echo "Set STAGING_URL to the API origin (no trailing slash), e.g. https://traphousekitchen-api.onrender.com"
  exit 1
fi

echo "Checking ${BASE}/health ..."
code=$(curl -sS -o /tmp/thk-health.json -w "%{http_code}" "${BASE}/health")
body=$(cat /tmp/thk-health.json)
echo "$body"
if [[ "$code" != "200" ]]; then
  echo "Expected HTTP 200, got $code"
  exit 1
fi
if ! echo "$body" | grep -q '"status":"ok"'; then
  echo 'Expected JSON status "ok"'
  exit 1
fi
if ! echo "$body" | grep -q '"database":"connected"'; then
  echo 'Expected database connected'
  exit 1
fi
echo "Staging validation passed."
