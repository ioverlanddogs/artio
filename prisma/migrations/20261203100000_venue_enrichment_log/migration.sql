CREATE TABLE "VenueEnrichmentLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "venueId" UUID NOT NULL,
  "runId" UUID NOT NULL,
  "changedFields" TEXT[] NOT NULL DEFAULT '{}',
  "before" JSONB NOT NULL DEFAULT '{}',
  "after" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "VenueEnrichmentLog"
ADD CONSTRAINT "VenueEnrichmentLog_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE;

ALTER TABLE "VenueEnrichmentLog"
ADD CONSTRAINT "VenueEnrichmentLog_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "IngestRun"("id") ON DELETE CASCADE;

CREATE INDEX "VenueEnrichmentLog_venueId_createdAt_idx"
ON "VenueEnrichmentLog"("venueId", "createdAt" DESC);

ALTER TABLE "Venue"
ADD COLUMN "lastEnrichedAt" TIMESTAMPTZ,
ADD COLUMN "enrichmentSource" TEXT;
