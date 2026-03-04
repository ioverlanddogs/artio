-- CreateTable
CREATE TABLE "EventSeries" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "venueId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "seriesId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "EventSeries_slug_key" ON "EventSeries"("slug");

-- CreateIndex
CREATE INDEX "EventSeries_venueId_idx" ON "EventSeries"("venueId");

-- CreateIndex
CREATE INDEX "Event_seriesId_startAt_idx" ON "Event"("seriesId", "startAt");

-- AddForeignKey
ALTER TABLE "EventSeries"
ADD CONSTRAINT "EventSeries_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event"
ADD CONSTRAINT "Event_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
