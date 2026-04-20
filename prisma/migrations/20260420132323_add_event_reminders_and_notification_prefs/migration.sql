-- AlterTable
ALTER TABLE "UserNotificationPrefs" ADD COLUMN "eventRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailOnFollowedCreatorUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailOnNearbyRecommendations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "quietHoursStart" TIME,
ADD COLUMN "quietHoursEnd" TIME;

-- CreateTable
CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventReminder_userId_eventId_reminderType_key" ON "EventReminder"("userId", "eventId", "reminderType");

-- CreateIndex
CREATE INDEX "EventReminder_userId_triggerAt_idx" ON "EventReminder"("userId", "triggerAt");

-- CreateIndex
CREATE INDEX "EventReminder_sentAt_idx" ON "EventReminder"("sentAt");

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE;
