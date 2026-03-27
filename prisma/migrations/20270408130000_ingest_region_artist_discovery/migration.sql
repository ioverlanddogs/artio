ALTER TABLE "IngestRegion"
  ADD COLUMN IF NOT EXISTS
  "artistDiscoveryEnabled" BOOLEAN NOT NULL DEFAULT false;
