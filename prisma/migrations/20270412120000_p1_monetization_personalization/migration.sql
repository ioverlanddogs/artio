DO $$ BEGIN
  CREATE TYPE "UserInteractionType" AS ENUM ('VIEW', 'SAVE', 'FOLLOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserInteractionEntityType" AS ENUM ('EVENT', 'ARTIST', 'VENUE', 'ARTWORK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VenueSubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserNotificationType" AS ENUM ('FOLLOWED_ARTIST_NEW_EVENT', 'FOLLOWED_VENUE_NEW_EVENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserInteraction" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "UserInteractionType" NOT NULL,
  "entityType" "UserInteractionEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VenueSubscription" (
  "id" UUID NOT NULL,
  "venueId" UUID NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT,
  "status" "VenueSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventPromotion" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "venueId" UUID NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventPromotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserNotification" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "UserNotificationType" NOT NULL,
  "entityId" UUID NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VenueSubscription_venueId_key" ON "VenueSubscription"("venueId");
CREATE UNIQUE INDEX IF NOT EXISTS "VenueSubscription_stripeCustomerId_key" ON "VenueSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "VenueSubscription_stripeSubscriptionId_key" ON "VenueSubscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "VenueSubscription_status_idx" ON "VenueSubscription"("status");
CREATE INDEX IF NOT EXISTS "VenueSubscription_currentPeriodEnd_idx" ON "VenueSubscription"("currentPeriodEnd");

CREATE INDEX IF NOT EXISTS "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_type_createdAt_idx" ON "UserInteraction"("userId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "UserInteraction_entityType_entityId_createdAt_idx" ON "UserInteraction"("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "EventPromotion_venueId_startsAt_endsAt_idx" ON "EventPromotion"("venueId", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "EventPromotion_eventId_idx" ON "EventPromotion"("eventId");
CREATE INDEX IF NOT EXISTS "EventPromotion_priority_idx" ON "EventPromotion"("priority");

CREATE UNIQUE INDEX IF NOT EXISTS "UserNotification_userId_type_entityId_key" ON "UserNotification"("userId", "type", "entityId");
CREATE INDEX IF NOT EXISTS "UserNotification_userId_read_createdAt_idx" ON "UserNotification"("userId", "read", "createdAt");

DO $$ BEGIN
  ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VenueSubscription" ADD CONSTRAINT "VenueSubscription_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventPromotion" ADD CONSTRAINT "EventPromotion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventPromotion" ADD CONSTRAINT "EventPromotion_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
