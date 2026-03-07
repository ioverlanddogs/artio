import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleGetTicketTiers, handlePostTicketTier } from "@/lib/ticket-tier-route";

export const runtime = "nodejs";

const deps = {
  requireAuth,
  findManagedEventById: (eventId: string, userId: string) => db.event.findFirst({
    where: {
      id: eventId,
      venue: { memberships: { some: { userId } } },
    },
    select: { id: true },
  }),
  listTiersByEventId: (eventId: string) => db.ticketTier.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  }),
  findMaxSortOrderByEventId: async (eventId: string) => {
    const tier = await db.ticketTier.findFirst({
      where: { eventId },
      orderBy: [{ sortOrder: "desc" }],
      select: { sortOrder: true },
    });
    return tier?.sortOrder ?? null;
  },
  createTier: (data: {
    eventId: string;
    name: string;
    description?: string | null;
    priceAmount: number;
    currency: string;
    capacity?: number | null;
    sortOrder: number;
    isActive: boolean;
  }) => db.ticketTier.create({ data }),
  findTierByIdAndEventId: (tierId: string, eventId: string) => db.ticketTier.findFirst({ where: { id: tierId, eventId } }),
  updateTier: (tierId: string, data: { name?: string; description?: string | null; capacity?: number | null; sortOrder?: number; isActive?: boolean }) =>
    db.ticketTier.update({ where: { id: tierId }, data }),
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  return handleGetTicketTiers(req, params, deps);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  return handlePostTicketTier(req, params, deps);
}
