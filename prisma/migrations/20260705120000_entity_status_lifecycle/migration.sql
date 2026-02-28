-- Add canonical lifecycle status for venue/event publishing.
ALTER TABLE "Venue"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "Venue_status_idx" ON "Venue"("status");
CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");
