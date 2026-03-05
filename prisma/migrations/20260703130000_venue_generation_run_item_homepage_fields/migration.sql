ALTER TABLE "VenueGenerationRunItem"
  ADD COLUMN IF NOT EXISTS "homepageImageStatus" TEXT NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS "homepageImageCandidateCount" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE "VenueHomepageImageCandidate"
    ADD CONSTRAINT "VenueHomepageImageCandidate_runItemId_fkey"
    FOREIGN KEY ("runItemId") REFERENCES "VenueGenerationRunItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
