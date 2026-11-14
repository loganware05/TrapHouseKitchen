# Slice 19 — Decisive CI validation

**Date:** 2026-11-13  
**Issue:** #42  
**Checkpoint:** `checkpoint/slice-19-decisive-ci-2026-11-13` → `9ac0008`

## Changes

- `@playwright/test` **1.65.1**; CI E2E on `ubuntu-latest`
- `npm run test:e2e:core` (`--grep @core`); workflow runs core only, **no** `continue-on-error`
- Rate limiters skip when `E2E_CAPTURE_PASSWORD_RESET=1` or `VITEST=true`
- ProtectedRoute waits for session restore before redirecting to login
- Auth E2E logout selector matches accessible name `Log out`
- Mobile PTR skips cleanly when Touch constructors throw

## Local evidence

```
npm run e2e:seed && npm run test:e2e:core
→ 15 passed, 4 skipped (payment gated; PTR Touch unavailable), 0 failed (~30s)
```

Payment `@core` tests remain gated on `PLAYWRIGHT_PAYMENT_TESTS=1` + real Stripe test keys (CI enables when secrets are non-placeholder).
