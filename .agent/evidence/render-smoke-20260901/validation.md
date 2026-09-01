# Render production smoke — post Slice 11 merge

**Date:** 2026-09-01  
**Baseline:** `c0db11e` on `main` (PR #27 + PR #28)  
**Targets:** `traphousekitchen-api.onrender.com`, `traphousekitchen-web.onrender.com`

## Checks

| Check | Result |
|-------|--------|
| `GET /health` | **200** — `database: connected` |
| `GET /api/categories` | **200** |
| `GET /api/reviews` | **200** |
| `GET /` (static web) | **200** |
| SPA bundle `assets/main-D2AO58ne.js` | **200** |
| CORS preflight (`Origin: traphousekitchen-web`) | **204** |

## Slice 11 bundle markers (production JS)

Confirmed strings in deployed bundle:

- `Quick reorder`
- `Saved discount codes`
- `Your reviews`
- `dish-requests`
- `PullToRefresh`

## Notes

- Render MCP workspace was not authorized in this session; smoke used public HTTPS curls.
- Stripe payment path not exercised in this smoke (no live checkout).
