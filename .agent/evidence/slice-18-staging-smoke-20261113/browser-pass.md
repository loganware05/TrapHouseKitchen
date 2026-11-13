# Staging browser smoke — 2026-11-13 (after env fix)

## Env verification (live)

| Check | Result |
|-------|--------|
| API CORS `Origin: …-web-staging` | `access-control-allow-origin: https://traphousekitchen-web-staging.onrender.com` |
| Static bundle API host | `https://traphousekitchen-api-staging.onrender.com/api` (asset `main-zStcV6df.js`) |
| Dishes | 1 (`Smoke Test Bowl`) |

## Browser path

| Step | Result |
|------|--------|
| Register customer | PASS — `POST …-api-staging…/api/auth/register` 201 |
| Menu / dish detail from staging API | PASS — dish GET 200 from staging |
| Add to cart | PASS — cart badge 1 item |
| Checkout sheet + dorm | PASS — Harvey Hall selected |
| Stripe Payment Element (test) | PASS — Payment details UI + `Pay $12.50`; Stripe iframes `keyMode=test` |
| Card confirm in browser iframes | **SKIPPED** — Stripe Elements iframe not fully automatable here; API path already confirmed success/decline (see `steps-5-10.md`) |

Screenshot: `screenshots/checkout-payment-element.png`

## Combined status

- **API steps 5–10:** PASS (prior run)
- **Browser wiring + cart → payment UI:** PASS
- **Browser card submit:** deferred (API evidence covers payment outcomes)
