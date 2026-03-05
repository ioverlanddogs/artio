DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VenueGenerationRunItem') THEN
    ALTER TABLE "VenueGenerationRunItem"
      ADD COLUMN IF NOT EXISTS "homepageImageStatus" TEXT NOT NULL DEFAULT 'skipped',
      ADD COLUMN IF NOT EXISTS "homepageImageCandidateCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "VenueHomepageImageCandidate" (
  "id" UUID NOT NULL,
  "venueId" UUID NOT NULL,
  "runItemId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "selectedAt" TIMESTAMPTZ,
  "selectedById" UUID,
  "venueImageId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VenueHomepageImageCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VenueHomepageImageCandidate_venueId_status_idx" ON "VenueHomepageImageCandidate"("venueId", "status");
CREATE INDEX IF NOT EXISTS "VenueHomepageImageCandidate_runItemId_idx" ON "VenueHomepageImageCandidate"("runItemId");

DO $$
BEGIN
  ALTER TABLE "VenueHomepageImageCandidate"
    ADD CONSTRAINT "VenueHomepageImageCandidate_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VenueHomepageImageCandidate"
    ADD CONSTRAINT "VenueHomepageImageCandidate_runItemId_fkey"
    FOREIGN KEY ("runItemId") REFERENCES "VenueGenerationRunItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VenueHomepageImageCandidate"
    ADD CONSTRAINT "VenueHomepageImageCandidate_selectedById_fkey"
    FOREIGN KEY ("selectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VenueHomepageImageCandidate"
    ADD CONSTRAINT "VenueHomepageImageCandidate_venueImageId_fkey"
    FOREIGN KEY ("venueImageId") REFERENCES "VenueImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
