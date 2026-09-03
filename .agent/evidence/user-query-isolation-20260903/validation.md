# Slice 13–14 validation — 2026-09-03

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Backend unit + integration | `cd backend && npm run test:all` | **PASS** — 21 files, 112 tests |
| Auth routes (incl. SHOW_PASSWORD_RESET_LINK) | `auth-routes.test.ts` | **PASS** — 11/11 |
| Frontend authQueryKeys selftest | `npx tsx frontend/src/lib/authQueryKeys.selftest.ts` | **PASS** |
| Frontend production build | `npm run build --prefix frontend` | **PASS** |

## Manual (Captain)

| Check | Result |
|-------|--------|
| Login as user A (with coupons) → logout → login as user B → Orders shows only B’s codes | Pending |
| Local: `SHOW_PASSWORD_RESET_LINK=1` → forgot password → copyable link → reset → login | Pending |

## Notes

- Slice 15 (PWA push) parked until Captain re-approves after this PR merges
- Push UX decision (when approved): toggle on Orders/Profile
- Capacitor push remains on waiting list
