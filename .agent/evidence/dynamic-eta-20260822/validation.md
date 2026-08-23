# Slice 9 — Dynamic ETA + prep intelligence validation

**Date:** 2026-08-22  
**Branch:** `feature/local-dynamic-eta`  
**Plan:** `slice-9-dynamic-eta-2026-08-22`

## Backend

- `npm run test:all` — **77/77 passed** (includes `prepTime.test.ts`, `prep-time.test.ts`; one performance flake on first run, green on retry)
- Unit: queue weighting, clamp, median/bias helpers, learning disabled by default in test env
- Integration: prep-intelligence endpoint, chef override PATCH, observation on COMPLETED

## Frontend

- `npm run build --prefix frontend` — pass (tsc + vite build)
- Chef Orders: kitchen queue summary + per-order prep editor
- Chef Dashboard: prep intelligence panel with learning status + dish suggestions
- Chef Orders + Dashboard: `allOrders` and `prepIntelligence` poll every 15s (`CHEF_KITCHEN_POLL_MS` via `frontend/src/lib/chefKitchen.ts`) so queue/status stay live

## Production notes

- Deploy with `PREP_LEARNING_ENABLED=0` (default)
- Optional tuning: `PREP_QUEUE_*`, `PREP_LEARNING_MIN_SAMPLES`, etc. (see `DEPLOYMENT_ENV_VARS.md`)
- Run migration `20260822120000_add_prep_intelligence` on Render Postgres before API deploy
