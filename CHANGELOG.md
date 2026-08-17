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
