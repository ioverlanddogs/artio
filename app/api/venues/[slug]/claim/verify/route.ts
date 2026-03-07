import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { enqueueNotification } from "@/lib/notifications";
import { verifyVenueClaim } from "@/lib/venue-claims/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  noStore();
  try {
    const { slug } = await ctx.params;
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) return apiError(400, "invalid_request", "token is required");

    const result = await verifyVenueClaim({ db: db as never, slug, token });
    const claim = await db.venueClaimRequest.findFirst({
      where: { venueId: result.venueId, status: "VERIFIED" },
      orderBy: [{ verifiedAt: "desc" }],
      select: { userId: true },
    });
    const [user, venue] = await Promise.all([
      claim?.userId ? db.user.findUnique({ where: { id: claim.userId }, select: { id: true, email: true } }) : Promise.resolve(null),
      db.venue.findUnique({ where: { id: result.venueId }, select: { slug: true, name: true } }),
    ]);

    if (user?.email && venue) {
      await enqueueNotification({
        type: "VENUE_CLAIM_APPROVED",
        toEmail: user.email,
        dedupeKey: `venue-claim-approved-${result.venueId}-${user.id}`,
        payload: { type: "VENUE_CLAIM_APPROVED", venueSlug: venue.slug, venueName: venue.name },
      });
    }

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "not_found") return apiError(404, "not_found", "Venue not found");
    if (error instanceof Error && error.message === "invalid_token") return apiError(400, "invalid_token", "Token is invalid or expired");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
