ALTER TABLE "IngestExtractedArtist"
  ADD COLUMN "lastApprovalAttemptAt" TIMESTAMPTZ,
  ADD COLUMN "lastApprovalError" TEXT,
  ADD COLUMN "imageImportStatus" TEXT,
  ADD COLUMN "imageImportWarning" TEXT;

ALTER TABLE "IngestExtractedArtwork"
  ADD COLUMN "lastApprovalAttemptAt" TIMESTAMPTZ,
  ADD COLUMN "lastApprovalError" TEXT,
  ADD COLUMN "imageImportStatus" TEXT,
  ADD COLUMN "imageImportWarning" TEXT;
