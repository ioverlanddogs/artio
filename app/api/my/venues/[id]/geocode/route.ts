import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireVenueRole, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { forwardGeocodeVenueAddressToLatLng, ForwardGeocodeError } from "@/lib/geocode/forward";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";
import { venueIdParamSchema, zodDetails } from "@/lib/validators";
import { buildVenueGeocodeQueries, isVenueAddressGeocodeable, normalizeCountryCode } from "@/lib/venues/format-venue-address";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = venueIdParamSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const user = await requireVenueRole(parsedParams.data.id, "EDITOR");
    await enforceRateLimit({
      key: principalRateLimitKey(req, "my-venue-geocode", user.id),
      limit: Number(process.env.RATE_LIMIT_MY_VENUE_GEOCODE_PER_HOUR ?? RATE_LIMITS.expensiveReads.limit),
      windowMs: Number(process.env.RATE_LIMIT_MY_VENUE_GEOCODE_WINDOW_MS ?? RATE_LIMITS.expensiveReads.windowMs),
    });

    const venue = await db.venue.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true, region: true, postcode: true, country: true },
    });
    if (!venue) return apiError(404, "not_found", "Venue not found");

    if (!isVenueAddressGeocodeable(venue)) {
      return NextResponse.json({ code: "no_match", message: "Location missing" }, { status: 422, headers: NO_STORE_HEADERS });
    }

    const queryTexts = buildVenueGeocodeQueries(venue);
    if (queryTexts.length === 0) return NextResponse.json({ code: "no_match", message: "Location missing" }, { status: 422, headers: NO_STORE_HEADERS });

    const result = await forwardGeocodeVenueAddressToLatLng({
      queryTexts,
      countryCode: normalizeCountryCode(venue.country),
    });

    if (!result) {
      return NextResponse.json({ code: "no_match", message: "No geocoding result found" }, { status: 422, headers: NO_STORE_HEADERS });
    }

    await db.venue.update({ where: { id: venue.id }, data: { lat: result.lat, lng: result.lng } });

    return NextResponse.json({ ok: true, lat: result.lat, lng: result.lng }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Venue membership required");
    if (error instanceof ForwardGeocodeError && error.code === "provider_timeout") return apiError(504, "provider_timeout", "Geocoding provider request timed out");
    if (error instanceof ForwardGeocodeError && error.code === "not_configured") return apiError(501, "not_configured", "Geocoding provider is not configured");
    if (error instanceof ForwardGeocodeError && error.code === "rate_limited") return apiError(429, "rate_limited", "Geocoding provider rate limited. Please retry shortly.");
    if (error instanceof ForwardGeocodeError) return apiError(502, "provider_error", "Geocoding provider failed (network/rate limit). Please retry.");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
