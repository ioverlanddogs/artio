INSERT INTO "EventImage" (id, "eventId", "assetId", url, alt, "sortOrder", "isPrimary", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  e.id,
  e."featuredAssetId",
  a.url,
  e.title,
  0,
  true,
  now(),
  now()
FROM "Event" e
JOIN "Asset" a ON a.id = e."featuredAssetId"
WHERE e."featuredAssetId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "EventImage" ei WHERE ei."eventId" = e.id
  );
