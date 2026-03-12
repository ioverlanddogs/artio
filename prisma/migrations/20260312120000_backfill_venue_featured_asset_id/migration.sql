UPDATE "Venue" v
SET "featuredAssetId" = vi."assetId"
FROM "VenueImage" vi
WHERE v."featuredAssetId" = vi.id
  AND vi."assetId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Asset" a
    WHERE a.id = v."featuredAssetId"
  );
