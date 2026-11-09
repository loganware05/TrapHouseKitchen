# Changelog

## Unreleased

### Security

- Production rejects missing or default `JWT_SECRET` at API startup; JWT auth requires matching `tokenVersion` (claim-less tokens invalid).
- Render API no longer seeds the database on every boot; production seed requires explicit opt-in and should not create fixed Chef credentials.
- Ops script `backend/scripts/set-user-password.ts` rotates a user password and bumps `tokenVersion`.

### Fixed

- Payment success finalization is transactional (row locks): concurrent webhook/client sync cannot create duplicate CHARGE rows or double-consume coupons; late `payment_failed` cannot downgrade PAID; `charge.refunded` is idempotent via unique `stripeRefundId`.
- Late Stripe payment success no longer attempts to move fulfilled orders back to Pending (preserves PREPARING+ while still marking PAID).
- Privacy Policy and Terms contact block uses real business address/phone/email.
- README scripts match actual package manifests (no false root `npm test` / `npm start`).
- CI: Vitest integration files run sequentially to avoid shared coupon-gateway races; JWT unit tests no longer reassign `process.env`; Playwright E2E job pinned to `ubuntu-24.04` (Playwright 1.58 lacks Chromium for Ubuntu 26.04).

## [Slice 17] — 2026-11-09

Shipped on `main` via PR #35 (`a195175`): payment safety matrix (transactional finalize, sticky refunds, race/idempotency tests).

## [Slice 16] — 2026-11-06

Shipped on `main` via PR #33 (`a3733be`): release-gap hardening toward campus service night NorthStar.

### Added

- PWA Web Push (Slice 15): Profile opt-in toggle for order-status notifications; VAPID env keys; `PushSubscription` persistence; push on Preparing / Ready / Out for delivery only; logout revokes subscriptions.
- Non-prod password-reset smoke helper: set `SHOW_PASSWORD_RESET_LINK=1` (never in production) so forgot-password returns a copyable `resetUrl` on the page.
- Password reset: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `/forgot-password` and `/reset-password` UI, login “Forgot password?” link; reset tokens stored as SHA-256 hashes.
- Payment hardening: reject checkout when `couponCode` disagrees with order `appliedCouponId`; webhook idempotency and payment service unit/integration tests.
- Customer bottom nav: Home, Reviews, Requests, Orders (Menu via Home browse links).

### Fixed

- Customer coupons/orders/reviews/profile caches no longer leak across accounts after logout or login as a different user (user-scoped React Query keys + cache clear on auth change; JWT written to `localStorage` before auth state updates; API responses not PWA-cached).

- Unified Reviews tab: community reviews first, then your approved and pending reviews.
- App-wide pull-to-refresh via layout registry; `ios-pull-to-refresh` Captain's Compass skill.
- Apple Pay-first checkout via Stripe Express Checkout Element, with card/other-method fallback and Chromium E2E coverage for success, decline, and unsupported-Apple-Pay clients.

### Changed

- Profile receipts: collapsible dropdown showing up to 3 recent completed orders (30-day window), below Legal; saved cards, allergen, and dietary sections removed from profile.
- Orders tab: quick reorder and saved/used discount codes moved from Home and Reviews.
- Editing an approved review sends it back to chef for re-approval (no duplicate coupon on re-approve).
- Dish Add actions now update the cart without opening checkout; customers open checkout from the cart button in the top header.
- Mobile cart access moved from a floating overlay to the header beside Profile.

### Fixed

- Removed the customer-facing “Build my meal under” experience and the Profile AI meal builder stats card, while retaining the backend AI endpoint for possible future use.
- Chef sidebar/mobile nav no longer keeps Dashboard highlighted when viewing other Chef tabs (e.g. Orders).
- Unpaid, pending, and failed-payment orders no longer appear in customer or chef order lists; abandoned checkouts auto-cancel after ~30 minutes; canceled PaymentIntents mark the order cancelled.
- Checkout requires a dorm delivery location; East/North/West/Marable also require a room number; location appears on customer and chef order views.
- Orders advance Placed → Preparing → Ready → Out for delivery → Complete; Chef cannot skip steps; customer tracker shows five delivery-oriented steps.
- Order confirmation (and active order lists) poll status about every 15 seconds so Chef updates appear without a manual reload.
- Pull-to-refresh on Home, Menu, Orders, and Chef dashboard/orders (touch, at top of page).
- Completed paid orders show as receipts on Orders and Profile with per-dish leave-review; review form preselects dish from URL.
- Chef review approval no longer issues $4 coupons (coupon checkout APIs retained for a later fix).
- Checkout ETA uses dish prep × quantity + status-weighted kitchen queue (READY weighted lower than PENDING/PREPARING); chef can override per-order prep time; learning bias is env-gated (`PREP_LEARNING_ENABLED`).
- Chef kitchen queue and order list auto-refresh every 15 seconds (same cadence as customer order status polling).
- Coupons: chef-gated review-approve awards (toggle + amount); checkout discounts are one-time use; customer receipts mark coupons earned vs used; My Reviews shows redeemed codes separately.
