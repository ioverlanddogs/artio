import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { resolveAssetDisplay } from "@/lib/assets/resolve-asset-display";
import { toApiImageField } from "@/lib/assets/image-contract";
import { distanceKm, getBoundingBox, isWithinRadiusKm } from "@/lib/geo";
import { nearbyVenuesQuerySchema, paramsToObject, zodDetails } from "@/lib/validators";
import { publishedVenueWhere } from "@/lib/publish-status";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

type NearbyVenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  images?: Array<{ url: string | null; asset?: { url: string | null; originalUrl?: string | null; processingStatus?: string | null; processingError?: string | null; variants?: Array<{ variantName: string; url: string | null }> } | null }>;
};

export async function GET(req: NextRequest) {
  const parsed = nearbyVenuesQuerySchema.safeParse(paramsToObject(req.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid query parameters", zodDetails(parsed.error));
  const { lat, lng, radiusKm, limit, cursor, q, tags, from, to, days } = parsed.data;
  try {
    await enforceRateLimit({
      key: principalRateLimitKey(req, "venues:nearby"),
      limit: RATE_LIMITS.expensiveReads.limit,
      windowMs: RATE_LIMITS.expensiveReads.windowMs,
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    throw error;
  }

  const now = new Date();
  const windowStart = from ? new Date(from) : now;
  const windowEnd = to ? new Date(to) : (days ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : undefined);
  const eventWindowFilter = (tags.length || from || to || days)
    ? {
      events: {
        some: {
          isPublished: true,
          startAt: {
            gte: windowStart,
            ...(windowEnd ? { lte: windowEnd } : {}),
          },
          ...(tags.length ? { eventTags: { some: { tag: { slug: { in: tags } } } } } : {}),
        },
      },
    }
    : {};
  const box = getBoundingBox(lat, lng, radiusKm);

  const batch = (await db.venue.findMany({
    where: {
      ...publishedVenueWhere(),
      deletedAt: null,
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
      ...eventWindowFilter,
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" }, include: { asset: { select: { url: true, originalUrl: true, processingStatus: true, processingError: true, variants: { select: { variantName: true, url: true } } } } } },
    },
  })) as NearbyVenueRow[];

  const filtered = batch.filter(
    (venue) =>
      venue.lat != null &&
      venue.lng != null &&
      isWithinRadiusKm(lat, lng, venue.lat, venue.lng, radiusKm),
  );
  const pageItems = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

  const response = NextResponse.json({
    items: pageItems.map((venue) => {
      const imageDisplay = resolveAssetDisplay({
        asset: venue.images?.[0]?.asset ?? null,
        requestedVariant: "card",
        legacyUrl: venue.images?.[0]?.url ?? null,
      });
      return ({
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      city: venue.city,
      lat: venue.lat,
      lng: venue.lng,
      distanceKm: venue.lat != null && venue.lng != null ? Number(distanceKm(lat, lng, venue.lat, venue.lng).toFixed(2)) : null,
      image: toApiImageField(imageDisplay),
      primaryImageUrl: imageDisplay.url,
    });
    }),
    nextCursor,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
