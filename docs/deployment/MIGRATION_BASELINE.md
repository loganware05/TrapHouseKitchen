# Prisma migration baseline (adopt from db push)

## Context

Shared/production databases may already match `schema.prisma` via historical `prisma db push`. This repo now ships a first `backend/prisma/migrations/` history. Running `prisma migrate deploy` on an already-synced DB **without** recording applied migrations will fail or attempt to re-apply SQL.

## Adopt an existing database (Render / prod)

1. Confirm the live schema already matches `backend/prisma/schema.prisma` (or bring it in line first).
2. From `backend/` with `DATABASE_URL` pointing at that database, mark historical migrations as applied **without** running SQL:

```bash
npx prisma migrate resolve --applied 20250325120000_init
npx prisma migrate resolve --applied 20250325194900_milestone2_schema_evolution
npx prisma migrate resolve --applied 20260121235009_add_reviews_and_coupons
npx prisma migrate resolve --applied 20260325175000_add_user_stripe_customer_id
npx prisma migrate resolve --applied 20260326120000_transaction_stripe_charge_id_unique
npx prisma migrate resolve --applied 20260326203200_add_password_reset_fields
```

Only resolve migrations whose changes are already present in the DB. Skip any migration that is not yet reflected in the schema.

3. Then run:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

4. **Before** resolving `20260326120000_transaction_stripe_charge_id_unique`, ensure there are no duplicate non-null `Transaction.stripeChargeId` values — the unique index will fail otherwise.

## Fresh databases

`prisma migrate deploy` alone is enough (CI and new envs).

## Do not

- Do not run `migrate deploy` against a db-push–managed prod DB without the resolve steps above.
- Do not delete or rewrite applied migration folders after they land on `main`.
