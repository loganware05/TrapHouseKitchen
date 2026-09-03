# Slice 12 validation — 2026-09-01

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Backend unit + integration | `cd backend && npm run test:all` | **PASS** — 21 files, 111 tests |
| Frontend production build | `npm run build --prefix frontend` | **PASS** |
| Password reset hashing | `passwordResetToken.test.ts` | **PASS** |
| Auth routes (forgot/reset) | `auth-routes.test.ts` | **PASS** |
| Payment service + mismatch | `payment.service.test.ts` | **PASS** |
| Stripe webhooks | `webhook-stripe.test.ts` | **PASS** |

## E2E (run before merge)

| Check | Command | Result |
|-------|---------|--------|
| Auth forgot → reset → login | `npx playwright test e2e/auth-flow.spec.ts -g "forgot password"` | Pending — requires local DB + `E2E_CAPTURE_PASSWORD_RESET=1` on API (set in `playwright.config.ts` webServer) |
| Payment flow | `PLAYWRIGHT_PAYMENT_TESTS=1 npx playwright test e2e/payment-flow.spec.ts` | Pending — requires Stripe test keys |

## Captain manual QA

See `qa-checklist.md` — §1.6 forgot/reset, §1.13–1.17, §4.x Stripe.

## Notes

- Reset tokens: SHA-256 at rest; E2E reads `.agent/e2e-capture/password-reset/<email>.token`
- Canceled PI: order `status` → `CANCELLED` (not `paymentStatus: FAILED`)
