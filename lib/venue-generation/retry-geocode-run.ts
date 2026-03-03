import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForwardGeocodeError, forwardGeocodeVenueAddressToLatLng } from "@/lib/geocode/forward";
import { buildVenueGeocodeQueries, normalizeCountryCode } from "@/lib/venues/format-venue-address";

type RetryDeps = {
  requireAdminFn: typeof requireAdmin;
  dbClient: typeof db;
  geocodeFn: typeof forwardGeocodeVenueAddressToLatLng;
  sleepFn: (ms: number) => Promise<void>;
};

function incrementBreakdown(map: Record<string, number>, code: string) {
  map[code] = (map[code] ?? 0) + 1;
}

export async function handleRetryVenueGenerationGeocode(_req: NextRequest, context: { params: Promise<{ runId: string }> }, deps?: Partial<RetryDeps>) {
  try {
    const requireAdminFn = deps?.requireAdminFn ?? requireAdmin;
    const dbClient = deps?.dbClient ?? db;
    const geocodeFn = deps?.geocodeFn ?? forwardGeocodeVenueAddressToLatLng;
    const sleepFn = deps?.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    await requireAdminFn();
    const { runId } = await context.params;

    const run = await dbClient.venueGenerationRun.findUnique({ where: { id: runId }, select: { id: true, geocodeFailureBreakdown: true } });
    if (!run) return apiError(404, "not_found", "Run not found");

    const items = await dbClient.venueGenerationRunItem.findMany({
      where: { runId, status: "created", venueId: { not: null } },
      select: {
        id: true,
        venueId: true,
        venue: { select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true, region: true, postcode: true, country: true, lat: true, lng: true } },
      },
    });

    let attempted = 0;
    let succeeded = 0;
    let failed = 0;
    const updates: Array<{ itemId: string; venueId: string; status: string; code?: string }> = [];
    const breakdown: Record<string, number> = { ...((run.geocodeFailureBreakdown as Record<string, number> | null) ?? {}) };

    for (const item of items) {
      const venue = item.venue;
      if (!venue || (venue.lat != null && venue.lng != null)) continue;

      const queryTexts = buildVenueGeocodeQueries(venue);
      if (queryTexts.length === 0) {
        attempted += 1;
        await dbClient.venueGenerationRunItem.update({ where: { id: item.id }, data: { geocodeStatus: "no_match", geocodeErrorCode: null } });
        updates.push({ itemId: item.id, venueId: venue.id, status: "no_match" });
        continue;
      }

      try {
        const geocoded = await geocodeFn({ queryTexts, countryCode: normalizeCountryCode(venue.country) });
        attempted += 1;

        if (!geocoded) {
          await dbClient.venueGenerationRunItem.update({ where: { id: item.id }, data: { geocodeStatus: "no_match", geocodeErrorCode: null } });
          updates.push({ itemId: item.id, venueId: venue.id, status: "no_match" });
          continue;
        }

        await dbClient.venue.update({ where: { id: venue.id }, data: { lat: geocoded.lat, lng: geocoded.lng } });
        await dbClient.venueGenerationRunItem.update({ where: { id: item.id }, data: { geocodeStatus: "succeeded", geocodeErrorCode: null } });
        succeeded += 1;
        updates.push({ itemId: item.id, venueId: venue.id, status: "succeeded" });
      } catch (error) {
        attempted += 1;
        if (error instanceof ForwardGeocodeError) {
          failed += 1;
          incrementBreakdown(breakdown, error.code);
          await dbClient.venueGenerationRunItem.update({ where: { id: item.id }, data: { geocodeStatus: "failed", geocodeErrorCode: error.code } });
          updates.push({ itemId: item.id, venueId: venue.id, status: "failed", code: error.code });
          if (error.code === "rate_limited") {
            await dbClient.venueGenerationRun.update({ where: { id: runId }, data: { geocodeAttempted: { increment: attempted }, geocodeSucceeded: { increment: succeeded }, geocodeFailed: { increment: failed }, geocodeFailureBreakdown: breakdown } });
            return NextResponse.json({ ok: false, message: "Stopped retry early due to geocoder rate limit; retry again shortly.", updatedItems: updates }, { headers: { "Cache-Control": "no-store" } });
          }
          continue;
        }
        throw error;
      }

      await sleepFn(120);
    }

    const refreshed = await dbClient.venueGenerationRun.update({
      where: { id: runId },
      data: { geocodeAttempted: { increment: attempted }, geocodeSucceeded: { increment: succeeded }, geocodeFailed: { increment: failed }, geocodeFailureBreakdown: breakdown },
      select: { id: true, geocodeAttempted: true, geocodeSucceeded: true, geocodeFailed: true, geocodeFailureBreakdown: true },
    });

    return NextResponse.json({ ok: true, message: `Retried geocoding for ${attempted} venues.`, updatedItems: updates, run: refreshed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
