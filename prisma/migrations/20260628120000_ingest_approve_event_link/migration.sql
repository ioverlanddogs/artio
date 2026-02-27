-- AlterTable
ALTER TABLE "IngestExtractedEvent"
ADD COLUMN "createdEventId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "IngestExtractedEvent_createdEventId_key" ON "IngestExtractedEvent"("createdEventId");

-- AddForeignKey
ALTER TABLE "IngestExtractedEvent" ADD CONSTRAINT "IngestExtractedEvent_createdEventId_fkey" FOREIGN KEY ("createdEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
