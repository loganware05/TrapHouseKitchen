# Slice 13–14 validation — 2026-09-03 (updated 2026-09-04)

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Backend unit + integration | `cd backend && npm run test:all` | **PASS** — 21 files, 113 tests (incl. two-user `/coupons/my` isolation + `Cache-Control`) |
| Auth routes (incl. SHOW_PASSWORD_RESET_LINK) | `auth-routes.test.ts` | **PASS** — 11/11 |
| Frontend authQueryKeys selftest | `npx tsx frontend/src/lib/authQueryKeys.selftest.ts` | **PASS** |
| Frontend authSessionToken selftest | `npx tsx frontend/src/lib/authSessionToken.selftest.ts` | **PASS** |
| Frontend production build | `npm run build --prefix frontend` | **PASS** |

## Manual (Captain)

| Check | Result |
|-------|--------|
| Login as user A (with coupons) → logout → login as user B → Orders shows only B’s codes | Pending retest after 2026-09-04 race fix |
| Local: `SHOW_PASSWORD_RESET_LINK=1` → forgot password → copyable link → reset → login | **PASS** (Captain 2026-09-04) |

## Follow-up fix (2026-09-04)

Cross-account coupon leak after query-key isolation was caused by writing the new JWT to `localStorage` *after* Zustand `set({ user })`, so axios could still send the previous Bearer token into the new user’s `['myCoupons', userId]` cache entry.

Also: Workbox API strategy → `NetworkOnly`; `/coupons/my` → `Cache-Control: private, no-store`.

## Notes

- Slice 15 (PWA push) parked until Captain re-approves after this PR merges
- Push UX decision (when approved): toggle on Orders/Profile
- Capacitor push remains on waiting list
