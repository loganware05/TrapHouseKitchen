# Security review — Slice 15 PWA web push

**Date:** 2026-09-04  
**Scope:** `/api/push/*`, `PushSubscription` model, `sendOrderStatusPush`, Profile toggle, logout revoke

## Findings

| Severity | Finding | Remediation / status |
|----------|---------|----------------------|
| — | Auth required on all push routes | `authenticate` middleware on vapid key, list, subscribe, unsubscribe |
| — | Owner-only unsubscribe | `deletePushSubscriptionForUser` returns **403** if endpoint owned by another user (integration covered) |
| — | No cross-user list leak | List filters by `req.user.id`; `Cache-Control: private, no-store` |
| — | Send only to order customer | `sendOrderStatusPush({ userId: order.userId })` — never broadcasts |
| — | Status gating | Only PREPARING / READY / OUT_FOR_DELIVERY |
| — | Secrets | VAPID private key via env only; `.env` gitignored; `.env.example` placeholders empty |
| Low | Endpoint reassignment on upsert | Intentional for device re-login; previous owner's row for that endpoint is overwritten to current user |
| Info | VAPID public key requires auth | Reduces anonymous scraping; public key is not secret by design |

## Residual risk

- Without VAPID env in production, subscribe returns 503 and no pushes are sent (fail closed).
- Push payload includes order id / status — acceptable for the owning device; do not expand payload with PII.
