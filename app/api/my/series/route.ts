import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { requireVenueRole, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleCreateSeries } from "@/lib/my-series-routes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    return await handleCreateSeries(req, {
      requireVenueRole,
      findSeriesBySlug: (slug) => db.eventSeries.findUnique({ where: { slug }, select: { id: true } }),
      createSeries: ({ title, slug, venueId }) => db.eventSeries.create({
        data: { title, slug, venueId },
        select: { id: true, title: true, slug: true, venueId: true },
      }),
    });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Venue membership required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
