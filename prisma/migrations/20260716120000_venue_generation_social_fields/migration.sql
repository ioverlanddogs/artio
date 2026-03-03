-- AlterTable
ALTER TABLE "Venue"
ADD COLUMN "facebookUrl" TEXT;

-- AlterTable
ALTER TABLE "VenueGenerationRunItem"
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "featuredImageUrl" TEXT,
ADD COLUMN "socialWarning" TEXT;
