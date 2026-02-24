-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedByAdminId" UUID, ADD COLUMN "deletedReason" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedByAdminId" UUID, ADD COLUMN "deletedReason" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedByAdminId" UUID, ADD COLUMN "deletedReason" TEXT;

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedByAdminId" UUID, ADD COLUMN "deletedReason" TEXT;

-- CreateIndex
CREATE INDEX "Venue_deletedAt_idx" ON "Venue"("deletedAt");
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");
CREATE INDEX "Artist_deletedAt_idx" ON "Artist"("deletedAt");
CREATE INDEX "Artwork_deletedAt_idx" ON "Artwork"("deletedAt");
