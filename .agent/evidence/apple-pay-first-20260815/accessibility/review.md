# Accessibility review — Apple Pay-first checkout

Date: 2026-08-15  
Bar: WCAG 2.1 AA (project target)

## Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Low | Express checkout loading | Wallet probe status is announced via `role="status"` / `aria-live="polite"` and visually suppressed until wallets are available | Pass |
| Info | Express section when unavailable | Fast-checkout heading remains off-screen until Stripe reports available methods, avoiding empty controls | Pass |
| Pass | Fallback payment | Payment details heading + keyboard-operable Pay button (`type="button"`) | Pass |
| Pass | Errors | Payment errors use `role="alert"` | Pass |
| Pass | Sheet chrome | Close control retains accessible name | Pass |

## Manual notes

- Touch target for Apple Pay button is configured at 52px when Stripe renders it.
- Real Apple Pay VoiceOver / Safari focus order still requires Captain-assisted device check.
