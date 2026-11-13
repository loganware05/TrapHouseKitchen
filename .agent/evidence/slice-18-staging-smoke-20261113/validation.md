# Slice 18 staging smoke — 2026-11-13

Hosts:
- API: `https://traphousekitchen-api-staging.onrender.com`
- Web: `https://traphousekitchen-web-staging.onrender.com`
- Code baseline on `main`: `c65d186` (PR #39)

## Checklist results

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | API `/health` | **PASS** | `{"status":"ok","database":"connected",...}` HTTP 200 |
| 2 | Staging web HTTPS loads | **PASS** | HTTP 200 HTML shell + `/assets/main-*.js` |
| 3 | Register customer | **PASS** (API) | `POST /api/auth/register` → success + JWT (`smoke-1794604662@example.com`) |
| 4 | Forgot-password smoke secret gate | **PASS** | Without header: no `resetUrl`. With `X-Password-Reset-Smoke-Secret`: `resetUrl` + `resetToken` present. **Note:** returned `resetUrl` host is still production web (see blockers). |
| 5 | Browse menu → cart → checkout | **PASS (API)** | Chef dish created; checkout 201. See `steps-5-10.md`. Browser still blocked by env. |
| 6 | Pay test card success | **PASS (API)** | Stripe test confirm `pm_card_visa` → PAID |
| 7 | Decline card | **PASS (API)** | `pm_card_chargeDeclined` → not PAID |
| 8 | Chef login sees paid order | **PASS** | Seeded `chef@traphouse.com` + pipeline on PAID order |
| 9 | Chef status advances | **PASS** | Through COMPLETED |
| 10 | Stripe Dashboard PI match | **PASS** | Test PI succeeded, amount/metadata match |

## Config findings (must fix before re-smoke)

1. **`FRONTEND_URL` on staging API is production**  
   Responses include `access-control-allow-origin: https://traphousekitchen-web.onrender.com`.  
   CORS preflight from staging web origin is **not** allowed.  
   Forgot-password `resetUrl` also pointed at production web.  
   **Fix:** set `FRONTEND_URL=https://traphousekitchen-web-staging.onrender.com` (no trailing slash) on `traphousekitchen-api-staging` and redeploy API.

2. **`VITE_API_URL` on staging static points at production API**  
   Bundle contains `https://traphousekitchen-api.onrender.com/api`.  
   **Fix:** set `VITE_API_URL=https://traphousekitchen-api-staging.onrender.com/api` and `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` on `traphousekitchen-web-staging`, then **Clear cache + redeploy** static site.

3. **Empty menu / no Chef**  
   Seed once via Render Shell on staging API (`cd backend && npm run prisma:seed`) **or** create Chef + dishes manually; rotate staging Chef password after seed.

## Stripe test keys

- Observed via `/api/payment/config`: test publishable + test secret aligned.  
- Do not record full key material in git beyond mode flags already returned by the API.

## Next

Captain applies the three env/seed fixes above → First Mate re-runs steps 2–10 (browser path + payment).
