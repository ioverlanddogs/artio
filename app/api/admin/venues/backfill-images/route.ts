import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleVenueHomepageImageSelect } from "@/lib/admin-venue-homepage-image-select-route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const venues = await db.venue.findMany({
      where: {
        deletedAt: null,
        images: { none: {} },
        homepageImageCandidates: {
          some: { status: "pending" },
        },
      },
      select: {
        id: true,
        name: true,
        homepageImageCandidates: {
          where: { status: "pending" },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { id: true },
        },
      },
      take: 50,
    });

    let promoted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const venue of venues) {
      const candidate = venue.homepageImageCandidates[0];
      if (!candidate) continue;

      try {
        const syntheticContext = {
          params: Promise.resolve({
            id: venue.id,
            candidateId: candidate.id,
          }),
        };

        const res = await handleVenueHomepageImageSelect(
          req as never,
          syntheticContext,
        );

        if (res.status === 200 || res.status === 201) {
          promoted += 1;
        } else {
          failed += 1;
          errors.push(`${venue.name}: status ${res.status}`);
        }
      } catch (error) {
        failed += 1;
        errors.push(
          `${venue.name}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
        console.warn("venue_image_backfill_failed", {
          venueId: venue.id,
          venueName: venue.name,
          candidateId: candidate.id,
          error,
        });
      }
    }

    return NextResponse.json(
      {
        ok: failed === 0,
        processedVenues: venues.length,
        promoted,
        failed,
        errors: errors.slice(0, 10),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isAuthError(error))
      return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden")
      return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
