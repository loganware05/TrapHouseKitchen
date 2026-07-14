-- AlterTable: Stripe Customer id for saved payment methods (see schema User.stripeCustomerId)
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
