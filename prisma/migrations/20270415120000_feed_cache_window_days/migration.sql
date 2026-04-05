-- Add DAILY digest frequency option
ALTER TYPE "DigestFrequency" ADD VALUE IF NOT EXISTS 'DAILY';

-- Scope user feed cache rows by requested window size
ALTER TABLE "UserFeedCache"
ADD COLUMN "windowDays" INTEGER NOT NULL DEFAULT 30;

-- Replace constraints/indexes to include windowDays
DROP INDEX IF EXISTS "UserFeedCache_userId_score_createdAt_idx";
DROP INDEX IF EXISTS "UserFeedCache_userId_eventId_key";

CREATE UNIQUE INDEX "UserFeedCache_userId_eventId_windowDays_key"
ON "UserFeedCache"("userId", "eventId", "windowDays");

CREATE INDEX "UserFeedCache_userId_windowDays_score_createdAt_idx"
ON "UserFeedCache"("userId", "windowDays", "score", "createdAt");
