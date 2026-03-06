ALTER TABLE "Artwork" ADD COLUMN IF NOT EXISTS "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill: published artworks → PUBLISHED, others stay DRAFT
UPDATE "Artwork" SET "status" = 'PUBLISHED' WHERE "isPublished" = true;

-- Add ARTWORK to SubmissionType enum
ALTER TYPE "SubmissionType" ADD VALUE IF NOT EXISTS 'ARTWORK';
