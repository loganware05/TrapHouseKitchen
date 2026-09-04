# Accessibility review — Profile push toggle

**Date:** 2026-09-04  
**Component:** `PushNotificationToggle` on `ProfilePage`

## Checks

| Check | Result |
|-------|--------|
| Interactive control role | `role="switch"` |
| Accessible name | `aria-label="Order push notifications"` |
| State | `aria-checked` reflects on/off |
| Description | `aria-describedby="push-toggle-description"` |
| Keyboard focus | Focusable; focus-visible ring styles present |
| Disabled when blocked / unsupported | `disabled` when permission denied or unsupported |
| Color alone | On/off also conveyed by `aria-checked` and sr-only On/Off text |
| Touch target | ~32×56px switch control |

## Evidence

- Browser smoke focused the switch and recorded `aria-label` + `aria-describedby` (`browser-smoke-notes.txt`).
- Screenshots: `../screenshots/05-profile-toggle-focused.png`, `03-profile-after-toggle.png`.

## Residual

- Toast success/error via Sonner — existing app pattern; not newly audited beyond presence after enable.
