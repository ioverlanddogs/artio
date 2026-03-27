-- Create ArtworkOrderStatus enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ArtworkOrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ArtworkOrder table (idempotent)
CREATE TABLE IF NOT EXISTS "ArtworkOrder" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "artworkId"             UUID NOT NULL,
  "buyerUserId"           UUID,
  "buyerName"             TEXT NOT NULL,
  "buyerEmail"            TEXT NOT NULL,
  "amountPaid"            INTEGER NOT NULL,
  "currency"              TEXT NOT NULL,
  "platformFeeAmount"     INTEGER NOT NULL,
  "stripePaymentIntentId" TEXT,
  "stripeSessionId"       TEXT,
  "status"                "ArtworkOrderStatus" NOT NULL
                            DEFAULT 'PENDING',
  "confirmedAt"           TIMESTAMPTZ,
  "cancelledAt"           TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "ArtworkOrder_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ArtworkOrder"
    ADD CONSTRAINT "ArtworkOrder_artworkId_fkey"
    FOREIGN KEY ("artworkId")
    REFERENCES "Artwork"("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtworkOrder"
    ADD CONSTRAINT "ArtworkOrder_buyerUserId_fkey"
    FOREIGN KEY ("buyerUserId")
    REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "ArtworkOrder_artworkId_idx"
  ON "ArtworkOrder"("artworkId");
CREATE INDEX IF NOT EXISTS "ArtworkOrder_status_idx"
  ON "ArtworkOrder"("status");
CREATE INDEX IF NOT EXISTS "ArtworkOrder_buyerEmail_idx"
  ON "ArtworkOrder"("buyerEmail");

ALTER TABLE "Artwork"
  ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMPTZ;
