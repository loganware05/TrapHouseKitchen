# Authentication

## Roles

- **Customer** — register / login, allergen profile, orders, reviews, dish requests.
- **Chef** — chef login (`/chef/login`), menu and order management, review moderation.
- **Guest** — checkout without an account (limited persistence).

## Mechanisms

- JWT issued by the backend (`/api/auth/*`).
- Passwords hashed with bcrypt.
- Frontend stores the token and sends `Authorization: Bearer`.

## Password reset

Implemented on branch `feat/password-reset` (merge pending unless already landed):

1. `POST /api/auth/forgot-password` — accepts email; always returns a generic success response.
2. Email (Resend) includes a link to `/reset-password?token=…` using `FRONTEND_URL`.
3. `POST /api/auth/reset-password` — sets a new password when the token is valid and unexpired.

**Ops:** requires `RESEND_API_KEY` and correct `FRONTEND_URL`.  
**Debt:** reset tokens are stored plaintext in the database until a hashing follow-up.

## Related

- Status: [STATUS.md](../../STATUS.md)
- Stripe customer linkage uses `User.stripeCustomerId` (separate from auth credentials)
