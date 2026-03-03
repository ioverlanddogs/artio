-- AlterTable
ALTER TABLE "VenueGenerationRun"
ADD COLUMN "totalFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "geocodeAttempted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "geocodeSucceeded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "geocodeFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "geocodeFailureBreakdown" JSONB;

-- CreateTable
CREATE TABLE "VenueGenerationRunItem" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "venueId" UUID,
    "geocodeStatus" TEXT NOT NULL DEFAULT 'not_attempted',
    "geocodeErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VenueGenerationRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueGenerationRunItem_runId_status_idx" ON "VenueGenerationRunItem"("runId", "status");
CREATE INDEX "VenueGenerationRunItem_runId_geocodeStatus_idx" ON "VenueGenerationRunItem"("runId", "geocodeStatus");
CREATE INDEX "VenueGenerationRunItem_venueId_idx" ON "VenueGenerationRunItem"("venueId");
CREATE INDEX "VenueGenerationRunItem_createdAt_idx" ON "VenueGenerationRunItem"("createdAt");

-- AddForeignKey
ALTER TABLE "VenueGenerationRunItem" ADD CONSTRAINT "VenueGenerationRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VenueGenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueGenerationRunItem" ADD CONSTRAINT "VenueGenerationRunItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
