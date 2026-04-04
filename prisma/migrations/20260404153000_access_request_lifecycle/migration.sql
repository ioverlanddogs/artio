-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccessRequestedRole" AS ENUM ('VIEWER', 'MODERATOR', 'OPERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestedRole" "AccessRequestedRole" NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessRequest_userId_status_idx" ON "AccessRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_user_pending_unique" ON "AccessRequest"("userId") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
