-- AlterTable
ALTER TABLE "IngestExtractedEvent"
ADD COLUMN "confidenceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "confidenceBand" TEXT,
ADD COLUMN "confidenceReasons" JSONB;

-- CreateIndex
CREATE INDEX "IngestExtractedEvent_runId_confidenceScore_idx" ON "IngestExtractedEvent"("runId", "confidenceScore");

-- CreateIndex
CREATE INDEX "IngestExtractedEvent_venueId_confidenceScore_idx" ON "IngestExtractedEvent"("venueId", "confidenceScore");
