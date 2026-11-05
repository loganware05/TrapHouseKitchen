# Slice 16 validation

Date: 2026-11-05
Branch: `fix/32-release-gaps-hardening`
Issue: #32
Rollback: `checkpoint/release-gaps-2026-11-05`

## Builds
- Backend `npm run build` (prisma generate + tsc): **PASS**
- Frontend `npm run build` (tsc + vite + PWA): **PASS**

## Unit tests
```
STRIPE_SECRET_KEY=sk_test_placeholder \
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
JWT_SECRET=unit-test-jwt-secret \
NODE_ENV=test \
npx vitest run tests/unit
```
Result: **49/49 PASS** (10 files), including jwtConfig, auth.middleware.tokenVersion, auth.service.

## Integration tests
Not run in this environment — Docker/Postgres unavailable (`docker_no`). New case added:
`payment_intent.succeeded after fulfillment advance keeps PREPARING and marks PAID`.
Re-run with local Postgres: `cd backend && npm run test:all`.

## Security notes
- Production Chef seed-password probe: **FAIL (still accepted)** — see `security/chef-seed-login-probe.md`. Captain must rotate before trusting production.
- JWT default-secret blocked in production; claim-less tokenVersion rejected.
- Render startCommand no longer seeds.

## Accessibility
Legal contact text updates only (no new interactive controls). No dedicated a11y suite run.
