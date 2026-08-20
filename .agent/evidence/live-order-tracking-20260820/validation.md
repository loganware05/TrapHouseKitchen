# Slice 6 — Live order tracking validation

**Date:** 2026-08-20  
**Branch:** `feature/local-live-order-tracking`  
**Issue:** `local/live-order-tracking`  
**Checkpoint:** `checkpoint/live-order-tracking-2026-08-20`

## Changes

- Confirmation page uses React Query with 15s `refetchInterval` (+ `refetchIntervalInBackground`)
- Detail fetch syncs into customer orders list cache
- `ProtectedRoute` waits for auth hydrate + `fetchUser` when a token exists (refresh of `/orders/:id`)
- E2E: Chef advances while confirmation stays open; asserts `aria-current` moves to Preparing

## Results

| Check | Result |
|-------|--------|
| Frontend `tsc --noEmit` | pass |
| `e2e/order-tracking.spec.ts` | **pass** (~17.7s, Chromium, local API + Vite) |

## Rollback

Redeploy checkpoint tag / prior `main` commit. No DB migration.
