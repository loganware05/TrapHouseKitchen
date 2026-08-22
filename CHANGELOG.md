# Changelog

## Unreleased

### Added

- Apple Pay-first checkout via Stripe Express Checkout Element, with card/other-method fallback and Chromium E2E coverage for success, decline, and unsupported-Apple-Pay clients.

### Changed

- Checkout primary CTA is now review-first: “Continue to payment · $X.XX”.
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
