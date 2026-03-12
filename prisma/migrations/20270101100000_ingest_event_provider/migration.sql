ALTER TABLE "IngestExtractedEvent"
  ADD COLUMN IF NOT EXISTS "extractionProvider" TEXT;
