# TrapHouse Kitchen — Pre-Launch QA Checklist

Use this for manual validation before production deploys, alongside automated tests (`backend npm run test:all`, `npm run test:e2e`).

**Legend:** | Pass | Fail | N/A | Notes |

---

## 1. Functional checks

| # | Area | Steps | Pass criteria | Result |
|---|------|--------|---------------|--------|
| 1.1 | **Registration** | Open `/register`, fill valid name/email/password/confirm, submit | Account created, redirected to home, session active | |
| 1.2 | **Registration validation** | Submit empty form; enter invalid email | Inline errors for required fields and invalid email | |
| 1.3 | **Login** | `/login` with valid customer credentials | Greeting heading visible, no error toast | |
| 1.4 | **Invalid login** | Wrong password | Error message, no redirect to home | |
| 1.5 | **Guest login** | Guest name + continue | Land on home as guest (where supported) | |
| 1.6 | **Forgot / reset password** | Request reset → use link/token → set new password | Can sign in with new password | |
| 1.7 | **Chef login** | `/chef/login` with chef user | Chef dashboard loads | |
| 1.8 | **Route protection** | While logged out, open `/orders`, `/cart` | Redirect to login or appropriate gate | |
| 1.9 | **Role gate** | Chef account opens `/cart` | Redirect away (e.g. `/chef`) | |
| 1.10 | **Menu browse** | `/menu`, switch categories, search | Dishes load; filters behave | |
| 1.11 | **Add to cart** | Add available dish as customer | Toast success; checkout sheet opens with **Pay** | |
| 1.12 | **Cart modify** | Change quantity, remove item in sheet | Totals update; empty cart shows sensible state | |
| 1.13 | **Checkout + payment** | Complete flow with Stripe **test** card `4242…4242` | Redirect/order confirmation; order visible under **Orders** | |
| 1.14 | **Declined card** | Use decline test card (e.g. `4000…9995`) | Error shown; cart/order not wrongly marked paid | |
| 1.15 | **Coupon valid** | Apply known valid code in checkout | Discount reflected in total | |
| 1.16 | **Coupon invalid / expired** | Bad code and expired code | Error toast; no silent success | |
| 1.17 | **Coupon remove** | Remove applied coupon | Total reverts | |
| 1.18 | **AI meal builder** | Home: budget → Go → Build → Add all to cart (when API key configured) | Recommendations appear; Pay path reachable | |
| 1.19 | **Order list** | `/orders` as customer | Orders listed with plausible status | |
| 1.20 | **Order detail** | Open one order | Status, items, totals visible; matches API | |
| 1.21 | **Chef order pipeline** | Chef: accept/progress/complete (per your UI labels) | Status changes persist; customer sees update after refresh | |
| 1.22 | **Reviews** | Submit review for completed order; chef approves if applicable | States match backend rules | |

---

## 2. UX / UI checks

| # | Check | What to observe | Pass |
|---|--------|-----------------|------|
| 2.1 | Loading states | AI build, menu fetch, checkout start | Spinners/skeletons; no “double submit” confusion | |
| 2.2 | Empty states | Empty cart, no orders | Helpful copy and next action | |
| 2.3 | Toasts | Success / error operations | Readable, dismissible, not duplicated | |
| 2.4 | Checkout sheet | Open/close, scroll long cart | Sheet usable, close affordance clear | |
| 2.5 | Error boundary | Force a client error (dev only) | Friendly fallback, not blank screen | |
| 2.6 | Focus / keyboard | Tab through login and checkout | Focus order logical; buttons activatable | |

---

## 3. Mobile usability (375px width)

| # | Flow | Steps | Pass |
|---|------|--------|------|
| 3.1 | Layout | Use devtools or device; no horizontal scroll on core pages | | |
| 3.2 | Nav | Reach menu, cart/checkout sheet, orders | Primary actions reachable without zoom | | |
| 3.3 | Chef mobile | Sidebar / hamburger equivalent | Orders and reviews accessible | | |
| 3.4 | Touch targets | Tap Add, Pay, close | No mis-taps; 44px-ish targets preferred | | |

---

## 4. Payment trust

| # | Check | Pass |
|---|--------|------|
| 4.1 | Production uses **HTTPS** only | |
| 4.2 | Card entry is in **Stripe Elements** (iframes), not raw inputs in your DOM | |
| 4.3 | **No** full card numbers or CVC in app logs, analytics, or support tickets | |
| 4.4 | Success page / order screen shows amount consistent with Stripe Dashboard | |
| 4.5 | `STRIPE_*` keys are **test** in staging, **live** only in prod | |

---

## 5. Error state validation

| # | Scenario | How to simulate | Pass |
|---|----------|----------------|------|
| 5.1 | API down | Stop backend; trigger menu load | User sees error, not infinite spin | |
| 5.2 | 404 route | Visit bogus path | Safe 404 or redirect | |
| 5.3 | Session expired | Clear token / wait for expiry; hit protected route | Redirect to login with clear UX | |
| 5.4 | Rate limit | Rapid auth failures (if enabled) | 429 or friendly lockout | |

---

## 6. Edge cases

| # | Case | Expected |
|---|------|----------|
| 6.1 | Double-click **Pay** | Single order/charge; idempotent or blocked | |
| 6.2 | Webhook delayed | UI may show pending; eventually consistent after webhook | |
| 6.3 | Dish becomes unavailable mid-checkout | Validation error or graceful handling | |
| 6.4 | Zero / negative tip | Only non-negative tips applied | |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| QA | | | |
| Product | | | |

---

## Automated coverage reference

- **Backend:** `cd backend && npm run test:all` (unit + integration + performance)
- **E2E:** `npm run e2e:seed` then `npm run test:e2e` (see `playwright.config.ts` env vars)
