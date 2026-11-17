# Slice 20 — Render redeploy smoke (2026-11-17)

Captain reported staging + production redeployed after PR #47 / docs closeout PR #48 (`e4fb791` on `main`).

Probed ~2026-11-17T03:30Z (UTC). Render MCP unauthorized — no dashboard deploy SHA read; public HTTP only.

## Production API (`traphousekitchen-api.onrender.com`)

| Check | Result |
|-------|--------|
| `GET /health` | OK — database connected |
| `GET /api/kitchen/status` | **200** — Slice 20 live (`acceptingOrders`, `timezone: America/Chicago`, etc.) |

Artifacts: `prod-health.json`, `prod-kitchen-status.json`

## Staging API (`traphousekitchen-api-staging.onrender.com`)

| Check | Result |
|-------|--------|
| `GET /health` | OK — database connected |
| `GET /api/dishes` | 200 (staging still serving API) |
| `GET /api/kitchen/status` | **404** `Cannot GET /api/kitchen/status` |

Artifact: `staging-health.json`, `staging-kitchen-status.txt`

## Verdict

- **Production:** Slice 20 kitchen ops endpoint present → code + migration path succeeded for prod.
- **Staging:** API is healthy but **does not yet expose** `/api/kitchen/status` → staging API process is still on a pre–Slice 20 build (redeploy incomplete, wrong branch, or failed build not live).

## Follow-up for Captain

1. In Render → `traphousekitchen-api-staging` → confirm latest deploy is `main` at/after `f5222e4` / `e4fb791` and succeeded.
2. Re-check `GET https://traphousekitchen-api-staging.onrender.com/api/kitchen/status` → expect 200 JSON like prod.
3. Optional: XRV still needs explicit production deploy SHA attestation for Slice 17 (`a195175`) if that remains open.
