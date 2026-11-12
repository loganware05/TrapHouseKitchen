# Staging environment (Slice 18)

Dedicated non-production stack for Pilot A / XRV smoke. Separate from production services in [`render.yaml`](../../render.yaml).

| Resource | Name |
|----------|------|
| Blueprint file | [`render.staging.yaml`](../../render.staging.yaml) |
| Postgres | `traphousekitchen-db-staging` |
| API | `traphousekitchen-api-staging` |
| Static web | `traphousekitchen-web-staging` |
| Expected hosts (default Render DNS) | `https://traphousekitchen-api-staging.onrender.com`, `https://traphousekitchen-web-staging.onrender.com` |

**Hard rules**

- Stripe **test** keys only (`sk_test_` / `pk_test_` + test webhook secret). Never paste live keys.
- Distinct `JWT_SECRET`, VAPID keys, and DB from production.
- `APP_ENV=staging` + `SHOW_PASSWORD_RESET_LINK=1` are set in the staging blueprint so forgot-password can return a copyable `resetUrl` without Resend. **Never** set those on production `traphousekitchen-api`.
- `NODE_ENV=production` remains set so JWT fail-closed behavior matches prod.

---

## Create (Captain / ops)

1. Render Dashboard → **New** → **Blueprint**.
2. Select this repo. Set blueprint path to **`render.staging.yaml`** (not `render.yaml`).
3. Review resources (`*-staging` only). Create services.
4. After services exist, set dashboard env (see [env matrix](#env-matrix)).
5. Deploy API first; wait for `/health`. Then set `VITE_*` on the static site and **redeploy** the static service.
6. Stripe Dashboard (test mode): add webhook `https://traphousekitchen-api-staging.onrender.com/api/webhooks/stripe` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`. Paste `whsec_…` into staging API.
7. Optional once: Render Shell on API → `cd backend && npm run prisma:seed` (creates local-style Chef — rotate that staging Chef password immediately).

Production blueprint / services must remain untouched.

---

## Env matrix

### API (`traphousekitchen-api-staging`)

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Blueprint `fromDatabase` | Staging DB only |
| `JWT_SECRET` | Generated | Must not equal production |
| `NODE_ENV` | Blueprint | `production` |
| `APP_ENV` | Blueprint | `staging` |
| `SHOW_PASSWORD_RESET_LINK` | Blueprint | `1` |
| `FRONTEND_URL` | Dashboard | `https://traphousekitchen-web-staging.onrender.com` (no trailing slash) |
| `STRIPE_SECRET_KEY` | Dashboard | `sk_test_…` |
| `STRIPE_PUBLISHABLE_KEY` | Dashboard | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Dashboard | Test-mode `whsec_…` |
| `CHEF_EMAIL` | Dashboard | Ops inbox for staging |
| `VAPID_*` | Dashboard (optional) | Separate keys from production or omit (push fail-closed) |
| `RESEND_API_KEY` | Optional | Not required when reset-link helper is on |

### Static (`traphousekitchen-web-staging`)

| Variable | Source | Notes |
|----------|--------|-------|
| `VITE_API_URL` | Dashboard | `https://traphousekitchen-api-staging.onrender.com/api` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Dashboard | Matching `pk_test_…` |

Redeploy the static site after any `VITE_*` change.

---

## Smoke checklist (customer → Chef)

Record results under `.agent/evidence/slice-18-staging-*/validation.md`.

| # | Step | Pass criteria |
|---|------|---------------|
| 1 | `GET https://<api-staging>/health` | JSON healthy / DB OK |
| 2 | Open staging web over HTTPS | App loads |
| 3 | Register customer (or login) | Session works |
| 4 | Forgot password (optional) | `resetUrl` returned / copyable; reset succeeds |
| 5 | Browse menu → add to cart → checkout | Totals sensible |
| 6 | Pay with Stripe test card `4242…4242` | Confirmation; order **PAID** |
| 7 | Decline card `4000…0002` or `4000…9995` | Error; cart/order not wrongly paid |
| 8 | Chef login on staging | Sees the paid order |
| 9 | Chef advances Preparing → Ready → Out for delivery | Customer status updates (poll/refresh) |
| 10 | Confirm Stripe Dashboard (test) shows matching PaymentIntent | Amount / status align |

Pilot A payment-safety extras (when exercising webhooks): duplicate succeed replay stays one CHARGE; late fail after PAID stays PAID; refund sticky — see `TESTING.md` Slice 17.

---

## Tear-down

1. Render → delete `traphousekitchen-web-staging`, `traphousekitchen-api-staging`, then `traphousekitchen-db-staging` (order: web → api → db).
2. Remove staging Stripe webhook endpoint.
3. Do **not** delete production `traphousekitchen-*` resources.
4. Optional: delete the staging Blueprint instance; keep `render.staging.yaml` in git for rebuild.

---

## Rollback

- Infra: tear down staging services (above); production unchanged.
- Repo: revert the Slice 18 PR or reset to tag `checkpoint/staging-rebuild-2026-11-11`.

---

## Related

- Production deploy: [render.md](./render.md)
- Env reference: [DEPLOYMENT_ENV_VARS.md](./DEPLOYMENT_ENV_VARS.md)
- Go-live: [go-live.md](./go-live.md)
- QA: [QA_CHECKLIST.md](../../QA_CHECKLIST.md)
