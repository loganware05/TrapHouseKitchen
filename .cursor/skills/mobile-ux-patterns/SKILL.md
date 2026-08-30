---
name: mobile-ux-patterns
description: Implements and reviews mobile-first navigation, cart actions, touch targets, overlays, pull-to-refresh, and responsive header behavior. Use for Traphouse Kitchen mobile/PWA layout changes, especially fixed controls and add-to-cart flows.
---

# Mobile UX Patterns

## Core rules

1. Adding a Dish updates cart state and confirms with a toast; it must not open checkout unless the control explicitly says checkout.
2. Persistent actions belong in reserved layout areas (header or navigation), not over content.
3. Avoid floating controls over card grids, form submit buttons, and safe-area navigation.
4. Keep touch targets at least 44×44px and provide an accessible name that includes dynamic state when useful.
5. On narrow headers, prioritize icon-only actions; reveal totals/names at larger breakpoints.
6. Preserve a single cart entry point across breakpoints and keep its item-count badge synchronized with Zustand cart state.
7. Pull-to-refresh is **touch-only**, arms only at document `scrollTop === 0`, requires a vertical-dominant gesture, and must be disabled while CheckoutSheet is open. Do not add a heavy gesture library. Indicator is decorative (no focus trap).

## Pull-to-refresh (Slice 7+)

| Piece | Path |
|-------|------|
| Logic | `frontend/src/lib/pullToRefreshLogic.ts` |
| Hook | `frontend/src/hooks/usePullToRefresh.ts` |
| Wrapper | `frontend/src/components/PullToRefresh.tsx` (Layout-level) |
| Registry | `frontend/src/contexts/PullToRefreshContext.tsx` — pages call `useRegisterPullToRefresh` |
| Surfaces | Customer: Home, Reviews, Requests, Orders, Profile, Menu (off-tab). Chef: Dashboard, Menu, Orders, Reviews, Requests |

Validate with `npx tsx src/lib/pullToRefreshLogic.selftest.ts` from `frontend/`. Prefer hook/logic tests over flaky Playwright touch-drag.

## Validation checklist

- Test at 375px width and desktop.
- Verify the add action does not navigate or open a sheet.
- Verify the cart action remains keyboard-operable and visible with an empty or non-empty cart.
- Check header actions do not overlap the brand or each other.
- Pull at top refreshes; pull mid-scroll does not; horizontal pans on strips do not refresh.
- Capture a mobile screenshot under `.agent/evidence/`.
- Run the frontend production build and affected Playwright specs.
