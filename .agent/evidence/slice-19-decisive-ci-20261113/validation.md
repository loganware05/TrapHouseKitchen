# Slice 19 — Decisive CI validation

**Date:** 2026-11-13  
**Issue:** #42  
**Checkpoint:** `checkpoint/slice-19-decisive-ci-2026-11-13` → `9ac0008`

## Changes

- `@playwright/test` **1.65.1**; CI E2E on `ubuntu-latest`
- `npm run test:e2e:core` (`--grep @core`); workflow runs core only, **no** `continue-on-error`
- Rate limiters: `authLimiter` skips only under Playwright E2E (`E2E_CAPTURE_PASSWORD_RESET=1`) so Vitest `security.test.ts` still asserts 429; api/order/payment/forgot skip under E2E or `VITEST=true`
- ProtectedRoute waits for session restore before redirecting to login
- Auth E2E logout selector matches accessible name `Log out`
- Mobile PTR skips cleanly when Touch constructors throw

## Local evidence

```
npm run e2e:seed && npm run test:e2e:core
→ 15 passed, 4 skipped (payment gated; PTR Touch unavailable), 0 failed (~30s)
```

## CI evidence (PR #43, head `ce4858a`)

- Run Tests: SUCCESS  
- Playwright E2E (blocking `@core`): SUCCESS  
- Workflow: https://github.com/loganware05/TrapHouseKitchen/actions/runs/43554005739  

Payment `@core` tests remain gated on `PLAYWRIGHT_PAYMENT_TESTS=1` + real Stripe test keys (CI enables when secrets are non-placeholder).

## CI follow-ups

- `authLimiter` must stay active under Vitest (`security.test.ts` 429) — skip only for Playwright E2E.
- Dev CORS allowlist includes `http://127.0.0.1:5173` so CI `PLAYWRIGHT_BASE_URL` can call the API (localhost-only list blocked register/login).
