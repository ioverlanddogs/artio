ALTER TABLE "Registration"
  ADD COLUMN "amountPaidGbp" INTEGER,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundedAmountGbp" INTEGER;
