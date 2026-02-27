-- AlterEnum
ALTER TYPE "IngestExtractedEventStatus" ADD VALUE 'DUPLICATE';

-- AlterTable
ALTER TABLE "IngestRun"
ADD COLUMN "createdDuplicates" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IngestExtractedEvent"
ADD COLUMN "similarityKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "clusterKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "duplicateOfId" UUID,
ADD COLUMN "similarityScore" INTEGER;

-- CreateIndex
CREATE INDEX "IngestExtractedEvent_runId_clusterKey_idx" ON "IngestExtractedEvent"("runId", "clusterKey");

-- CreateIndex
CREATE INDEX "IngestExtractedEvent_venueId_similarityKey_idx" ON "IngestExtractedEvent"("venueId", "similarityKey");

-- CreateIndex
CREATE INDEX "IngestExtractedEvent_duplicateOfId_idx" ON "IngestExtractedEvent"("duplicateOfId");

-- AddForeignKey
ALTER TABLE "IngestExtractedEvent" ADD CONSTRAINT "IngestExtractedEvent_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "IngestExtractedEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Align defaults with Prisma schema
ALTER TABLE "IngestExtractedEvent" ALTER COLUMN "similarityKey" DROP DEFAULT;
ALTER TABLE "IngestExtractedEvent" ALTER COLUMN "clusterKey" DROP DEFAULT;
