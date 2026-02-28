-- CreateEnum
CREATE TYPE "VenueClaimStatus" AS ENUM ('UNCLAIMED', 'PENDING', 'CLAIMED');

-- CreateEnum
CREATE TYPE "VenueClaimRequestStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Venue"
ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiGeneratedAt" TIMESTAMPTZ,
ADD COLUMN     "claimStatus" "VenueClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "openingHours" JSONB;

-- CreateTable
CREATE TABLE "VenueGenerationRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "totalReturned" INTEGER NOT NULL,
    "totalCreated" INTEGER NOT NULL,
    "totalSkipped" INTEGER NOT NULL,
    "triggeredById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "VenueGenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueClaimRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "venueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleAtVenue" TEXT NOT NULL,
    "message" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "status" "VenueClaimRequestStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "verifiedAt" TIMESTAMPTZ,

    CONSTRAINT "VenueClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueGenerationRun_createdAt_idx" ON "VenueGenerationRun"("createdAt");

-- CreateIndex
CREATE INDEX "VenueClaimRequest_venueId_idx" ON "VenueClaimRequest"("venueId");

-- CreateIndex
CREATE INDEX "VenueClaimRequest_userId_idx" ON "VenueClaimRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueClaimRequest_tokenHash_key" ON "VenueClaimRequest"("tokenHash");

-- AddForeignKey
ALTER TABLE "VenueGenerationRun" ADD CONSTRAINT "VenueGenerationRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueClaimRequest" ADD CONSTRAINT "VenueClaimRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueClaimRequest" ADD CONSTRAINT "VenueClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
