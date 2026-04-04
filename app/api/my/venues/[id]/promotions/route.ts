import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { guardUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await guardUser();
  if (user instanceof NextResponse) return user;

  const { id: venueId } = await ctx.params;
  const body = await req.json().catch(() => null) as { eventId?: string; startsAt?: string; endsAt?: string; priority?: number } | null;
  if (!body?.eventId || !body.startsAt || !body.endsAt) return apiError(400, "invalid_request", "eventId, startsAt and endsAt are required");

  const membership = await db.venueMembership.findFirst({ where: { venueId, userId: user.id }, select: { id: true } });
  if (!membership) return apiError(403, "forbidden", "Only venue team members can promote events");

  const subscription = await db.venueSubscription.findUnique({ where: { venueId }, select: { status: true } });
  if (!subscription || subscription.status !== "ACTIVE") return apiError(402, "payment_required", "Venue Pro subscription required");

  const event = await db.event.findFirst({ where: { id: body.eventId, venueId }, select: { id: true } });
  if (!event) return apiError(404, "not_found", "Event not found for this venue");

  const promotion = await db.eventPromotion.create({
    data: {
      eventId: body.eventId,
      venueId,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      priority: Math.max(1, Math.min(5, body.priority ?? 1)),
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
