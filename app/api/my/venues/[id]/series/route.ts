import { apiError } from "@/lib/api";
import { requireVenueRole, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleGetVenueSeries } from "@/lib/my-series-routes";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handleGetVenueSeries(params, {
      requireVenueRole,
      listSeriesByVenue: (venueId) => db.eventSeries.findMany({
        where: { venueId },
        select: { id: true, title: true, slug: true },
        orderBy: [{ title: "asc" }, { createdAt: "asc" }],
      }),
    });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Venue membership required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
