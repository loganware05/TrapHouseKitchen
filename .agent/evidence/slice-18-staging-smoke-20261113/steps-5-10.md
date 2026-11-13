# Staging smoke steps 5–10 (API path) — 2026-11-13

Hosts: `traphousekitchen-api-staging` / `traphousekitchen-web-staging`  
Method: API + Stripe test secret confirm (browser UI blocked — see env blockers below)

## Results

| # | Step | Result | Notes |
|---|------|--------|-------|
| 5 | Browse menu → checkout | **PASS (API)** | Created dish `Smoke Test Bowl` via Chef API; customer checkout 201 with dorm `Harvey Hall` |
| 6 | Pay test card success | **PASS (API)** | Confirmed PI `pi_3UbSCh3HCUaM188q0j9AdzzC` with `pm_card_visa` → `succeeded`; sync → `paymentStatus=PAID` |
| 7 | Decline card | **PASS (API)** | Confirm with `pm_card_chargeDeclined` → `card_declined` / `requires_payment_method`; order stayed `paymentStatus=PENDING` (not PAID) |
| 8 | Chef sees paid order | **PASS** | Chef `chef@traphouse.com` logged in; advanced the PAID order |
| 9 | Chef pipeline | **PASS** | PENDING→PREPARING→READY→OUT_FOR_DELIVERY→COMPLETED; customer final `COMPLETED` + `PAID` |
| 10 | Stripe PI match | **PASS** | Test-mode PI amount `1350` ($13.50), `livemode=false`, metadata `orderId` matches |

Raw machine summary: `steps-5-10-results.json` (no secrets).

## Still blocked for browser / Pilot A UI

As of smoke time, staging **browser** wiring was still wrong:

- API `Access-Control-Allow-Origin` → `https://traphousekitchen-web.onrender.com` (production)
- Static bundle still embeds `https://traphousekitchen-api.onrender.com/api` (production)

Captain said envs were redeployed; live responses did not reflect that. Re-check on **staging** services only:

1. API env `FRONTEND_URL=https://traphousekitchen-web-staging.onrender.com` → Manual Deploy  
2. Web env `VITE_API_URL=https://traphousekitchen-api-staging.onrender.com/api` → **Clear build cache + Deploy**  
3. Confirm with: CORS header from staging Origin, and new `/assets/main-*.js` hash containing staging API host

Until then, treat steps 5–10 as **API-verified**, not browser-verified.
