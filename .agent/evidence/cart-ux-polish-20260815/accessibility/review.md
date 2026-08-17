# Accessibility review — Slice 1 cart and menu UX

- Target: WCAG 2.1 AA
- Result: pass; no blocking findings

## Verified

- Header cart is a native button with a 44×44px minimum touch target.
- Accessible cart name includes the item count with correct singular/plural wording.
- Cart count badge uses `primary-700` for AA small-text contrast.
- Profile and Log out icon controls have explicit accessible names.
- Removing automatic checkout opening avoids an unexpected dialog/focus change after a Dish is added.
- Removing the floating cart prevents overlap with Dish Add controls.
- Mobile header and Add control are unobstructed at the iPhone 13 viewport.
- Menu Add buttons include the Dish name in their accessible label.
- Profile spending insights no longer include the AI meal builder stats card.

Screenshots: `../mobile-header-cart.png`, `../profile-no-meal-builder.png`.
