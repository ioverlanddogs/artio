-- CreateEnum
CREATE TYPE "StripeAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'DEAUTHORIZED');

-- AlterTable
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeWebhookSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "platformFeePercent" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "StripeAccount" (
  "id" UUID NOT NULL,
  "venueId" UUID NOT NULL,
  "stripeAccountId" TEXT NOT NULL,
  "status" "StripeAccountStatus" NOT NULL DEFAULT 'PENDING',
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StripeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_venueId_key" ON "StripeAccount"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_stripeAccountId_key" ON "StripeAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeAccount_stripeAccountId_idx" ON "StripeAccount"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "StripeAccount"
  ADD CONSTRAINT "StripeAccount_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
