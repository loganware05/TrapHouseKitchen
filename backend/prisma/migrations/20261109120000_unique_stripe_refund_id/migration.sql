-- Idempotent refund webhook rows: one Transaction per Stripe refund id
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_stripeRefundId_key" ON "Transaction"("stripeRefundId");
