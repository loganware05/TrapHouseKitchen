# Slice 18 validation

Date: 2026-11-11  
Branch: `chore/local-staging-rebuild`  
Issue: [#38](https://github.com/loganware05/TrapHouseKitchen/issues/38)  
Rollback: `checkpoint/staging-rebuild-2026-11-11` → `3ba1506`

## In-repo delivery

| Item | Status |
|------|--------|
| `render.staging.yaml` (`*-staging` DB/API/web) | Added; removed illegal `region` on static site (Render validation) |
| Production `render.yaml` untouched | Yes |
| `docs/deployment/staging.md` create/env/smoke/tear-down | Added |
| ADR-009 amend + ADR-016 | Updated |
| `SHOW_PASSWORD_RESET_LINK` + `APP_ENV=staging` gate | Implemented |
| Auth integration tests (staging expose / prod omit) | Added |
| `scripts/grep-migrate-deploy.mjs` includes staging blueprint | Updated |

## Commands (agent)

- `node scripts/grep-migrate-deploy.mjs` — PASS (`render.yaml` + `render.staging.yaml` migrate lines)
- Backend `npm run test:all` locally — FAIL reach DB (`localhost:5432` unavailable); **CI is source of truth** for auth-routes staging/prod reset-link cases

## Captain / ops remaining (not done by agent)

| Step | Status |
|------|--------|
| Create Render Blueprint from `render.staging.yaml` | OPEN (Render MCP unauthorized) |
| Set staging Stripe **test** keys + webhook | OPEN |
| Set `FRONTEND_URL` / `VITE_*` and redeploy static | OPEN |
| Smoke checklist in `docs/deployment/staging.md` | OPEN |
| Record staging URLs + smoke results here | OPEN |

## Note

Merged/in-repo Blueprint ≠ staging operational. Do not claim Pilot A operational verification until smoke rows above pass.
