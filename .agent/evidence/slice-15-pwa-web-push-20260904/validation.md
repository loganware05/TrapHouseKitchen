# Slice 15 — PWA web push validation

**Date:** 2026-09-04  
**Branch:** `feature/local-pwa-web-push`  
**Issue:** `local/slice-15-pwa-web-push`  
**Rollback:** `checkpoint/pwa-web-push-2026-09-04`

## Commands

```bash
cd backend && npx vitest run tests/unit/pushNotification.test.ts
cd backend && npx vitest run tests/integration/push-subscriptions.test.ts
cd frontend && npx tsx src/lib/webPush.selftest.ts
cd frontend && npm run build
node scripts/slice15-push-smoke.mjs
```

## Results

| Check | Result |
|-------|--------|
| Unit push gating + ownership | **8/8 passed** |
| Integration subscribe / cross-user 403 / status send / unsubscribe | **5/5 passed** |
| `webPush.selftest` | **ok** |
| Frontend production build | **passed** (SW imports `push-handler.js`) |
| Browser Profile toggle smoke | **passed** (see `browser-smoke-notes.txt` + screenshots) |

## Browser smoke notes

- Profile shows **Order notifications** switch; Orders page has **0** push toggles.
- Permission is **not** requested on login / first load (`Notification.permission` stayed `default` until toggle click).
- Enabling toggle with PushManager stub → backend stored subscription (`enabled=true`, count=1).
- Native Chromium headless `grantPermissions(['notifications'])` still reports `denied` in this cloud image; subscribe path validated with a PushManager stub after documenting that limitation.
- Screenshots: `screenshots/02b-profile-ready-to-enable.png`, `03-profile-after-toggle.png`, `04-orders-no-toggle.png`, `05-profile-toggle-focused.png`.

## Follow-up patches (2026-09-04 First Mate)

- Same-status no-ops no longer re-send Web Push (or status email / prep observation).
- Logout clears JWT immediately; push revoke runs afterward with the prior Bearer token and a 2s timeout.
- Selftest: `npx tsx frontend/src/lib/authLogoutPush.selftest.ts`

## Blockers / ops

- Real push delivery requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` on the API host (documented in `backend/.env.example` + `render.yaml` sync:false). Local `.env` used for smoke is **not** committed.
- End-to-end OS notification display was not asserted in headless Chromium; payload send is covered by mocked `web-push` integration tests.
- **Captain live smoke (2026-09-07):** production/web deploy SW present; order notifications confirmed working after VAPID setup.
