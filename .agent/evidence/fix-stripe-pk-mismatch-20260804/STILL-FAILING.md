# Why the error persists (2026-08-04 evening)

## Finding

**PR #13 is still OPEN (not merged).** Production web bundle is unchanged:

| Source | Mode | Account prefix |
|--------|------|----------------|
| API `/payment/config` | test | `51SnsOx3HC…` |
| Web JS bundle (`main-BY8U2shC.js`) | **live** (baked at build) | `51SnsOn39A…` |
| New runtime loader (`payment/config` in bundle) | **absent** | — |

So the browser still initializes Stripe with **live** `pk_live_…` while the API creates **test** PaymentIntents → same `client_secret` / account error.

## Required actions

1. **Merge PR #13** and wait for Render to redeploy **traphousekitchen-web** (and API).
2. Confirm API env: `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` are a matching pair (both `*_test_` for sandbox, same Stripe account).
3. Hard-refresh the site (or private window) and retry Pay with test card `4242…`.

## Follow-up commit on PR branch

Config now also returns `publishableKeyMode`, `secretKeyMode`, `keysAligned` (no secrets) so misconfiguration is visible without decoding the bundle.
