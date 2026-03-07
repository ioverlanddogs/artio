import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleGetMyEventRegistrations } from "@/lib/registration-list-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return handleGetMyEventRegistrations(req, eventId, {
    requireAuth,
    hasEventVenueMembership: async (targetEventId, userId) => {
      const count = await db.venueMembership.count({
        where: {
          userId,
          venue: { events: { some: { id: targetEventId } } },
        },
      });
      return count > 0;
    },
    findEventById: async (targetEventId) => db.event.findUnique({ where: { id: targetEventId }, select: { id: true, title: true, slug: true } }),
    listRegistrations: async ({ eventId: targetEventId, skip, take }) => db.registration.findMany({
      where: { eventId: targetEventId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        confirmationCode: true,
        guestName: true,
        guestEmail: true,
        tierId: true,
        tier: { select: { name: true } },
        status: true,
        quantity: true,
        stripePaymentIntentId: true,
        refundedAt: true,
        refundedAmountGbp: true,
        createdAt: true,
      },
    }).then((rows) => rows.map((row) => ({ ...row, tierName: row.tier?.name ?? null }))),
    countRegistrations: async (targetEventId) => db.registration.count({ where: { eventId: targetEventId } }),
    summarizeRegistrations: async (targetEventId) => {
      const [confirmed, waitlisted, cancelled] = await Promise.all([
        db.registration.count({ where: { eventId: targetEventId, status: "CONFIRMED" } }),
        db.registration.count({ where: { eventId: targetEventId, status: "WAITLISTED" } }),
        db.registration.count({ where: { eventId: targetEventId, status: "CANCELLED" } }),
      ]);
      return { confirmed, waitlisted, cancelled };
    },
    prisma: db,
    enqueueNotification: (async () => null) as never,
  });
}
