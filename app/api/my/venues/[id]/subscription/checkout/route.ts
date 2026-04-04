import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { guardUser } from "@/lib/auth-guard";
import { createVenueCheckoutSession } from "@/domains/monetisation/venue-subscription";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;

  const { id: venueId } = await ctx.params;
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      memberships: { where: { userId: user.id }, select: { id: true }, take: 1 },
    },
  });

  if (!venue || venue.memberships.length === 0) {
    return apiError(403, "forbidden", "Only venue team members can subscribe this venue");
  }

  const origin = req.nextUrl.origin;
  const session = await createVenueCheckoutSession(db, {
    venueId,
    email: user.email,
    successUrl: `${origin}/my/venues/${venueId}?billing=success`,
    cancelUrl: `${origin}/my/venues/${venueId}?billing=cancelled`,
  });

  return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
}
