-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "IngestRegionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IngestRegion" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "country"       TEXT NOT NULL,
  "region"        TEXT NOT NULL,
  "status"        "IngestRegionStatus" NOT NULL DEFAULT 'PENDING',
  "venueGenDone"  BOOLEAN NOT NULL DEFAULT false,
  "discoveryDone" BOOLEAN NOT NULL DEFAULT false,
  "lastRunAt"     TIMESTAMPTZ,
  "nextRunAt"     TIMESTAMPTZ,
  "errorMessage"  TEXT,
  "triggeredById" UUID NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "IngestRegion_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX IF NOT EXISTS "IngestRegion_status_nextRunAt_idx" ON "IngestRegion"("status", "nextRunAt");

-- FK
DO $$ BEGIN
  ALTER TABLE "IngestRegion"
    ADD CONSTRAINT "IngestRegion_triggeredById_fkey"
    FOREIGN KEY ("triggeredById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SiteSettings new columns
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "regionAutoPublishVenues"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regionAutoPublishEvents"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regionAutoPublishArtists"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regionAutoPublishArtworks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regionDiscoveryEnabled"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "regionMaxVenuesPerRun"     INTEGER;
