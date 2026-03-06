CREATE TABLE "ArtistEventAssociation" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "artistId"          UUID NOT NULL,
  "eventId"           UUID NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'PENDING',
  "role"              TEXT,
  "message"           TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "requestedByUserId" UUID,
  CONSTRAINT "ArtistEventAssociation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ArtistEventAssociation" ADD CONSTRAINT "ArtistEventAssociation_artistId_fkey"
  FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistEventAssociation" ADD CONSTRAINT "ArtistEventAssociation_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ArtistEventAssociation_artistId_eventId_key" ON "ArtistEventAssociation"("artistId", "eventId");
CREATE INDEX "ArtistEventAssociation_artistId_status_createdAt_idx" ON "ArtistEventAssociation"("artistId", "status", "createdAt");
CREATE INDEX "ArtistEventAssociation_eventId_status_createdAt_idx" ON "ArtistEventAssociation"("eventId", "status", "createdAt");
