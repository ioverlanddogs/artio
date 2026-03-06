DO $$ BEGIN
  CREATE TYPE "CampaignAudience" AS ENUM ('ALL_USERS', 'VENUE_OWNERS', 'ARTISTS', 'NEW_USERS_7D', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "bodyText" TEXT,
  "audienceType" "CampaignAudience" NOT NULL,
  "audienceFilter" JSONB,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "recipientCount" INTEGER,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "openedCount" INTEGER NOT NULL DEFAULT 0,
  "bouncedCount" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailCampaign_status_createdAt_idx" ON "EmailCampaign"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailCampaign_createdByUserId_createdAt_idx" ON "EmailCampaign"("createdByUserId", "createdAt");
