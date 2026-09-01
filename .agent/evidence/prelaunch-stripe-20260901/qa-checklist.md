# QA checklist — Slice 12 (pre-launch payments/auth)

Record pass/fail when running against staging or local with Resend + Stripe test keys.

| ID | Scenario | Pass |
|----|----------|------|
| 1.6 | Forgot password → email received → reset link works → login with new password | |
| 1.13 | Checkout with valid coupon | |
| 1.14 | Checkout coupon rejected when invalid/used | |
| 1.15 | Payment success webhook marks order paid | |
| 1.16 | Payment decline shows failure state | |
| 1.17 | Canceled checkout / PI cancel marks order cancelled | |
| 4.x | Stripe publishable key mode matches API (`GET /api/payment/config`) | |
