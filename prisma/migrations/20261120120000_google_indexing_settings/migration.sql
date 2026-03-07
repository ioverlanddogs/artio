ALTER TABLE "SiteSettings"
  ADD COLUMN "googleServiceAccountJson" TEXT,
  ADD COLUMN "googleIndexingEnabled" BOOLEAN NOT NULL DEFAULT false;
