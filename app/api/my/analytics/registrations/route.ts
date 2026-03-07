import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleGetMyAnalyticsRegistrations } from "@/lib/my-analytics-registrations-route";

export const runtime = "nodejs";

function dayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET() {
  return handleGetMyAnalyticsRegistrations({
    requireAuth,
    hasVenueMembership: async (userId) => Boolean(await db.venueMembership.findFirst({ where: { userId }, select: { id: true } })),
    listManagedEventIds: async (userId) => {
      const events = await db.event.findMany({
        where: { venue: { memberships: { some: { userId } } } },
        select: { id: true },
      });
      return events.map((event) => event.id);
    },
    listDailyRegistrationCounts: async (eventIds, start) => {
      const rows = await db.registration.findMany({
        where: { eventId: { in: eventIds }, status: "CONFIRMED", createdAt: { gte: start } },
        select: { createdAt: true },
      });
      const counts = new Map<string, number>();
      for (const row of rows) {
        const key = dayStart(row.createdAt).toISOString();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([iso, count]) => ({ day: new Date(iso), _count: { _all: count } }));
    },
    countConfirmedRegistrations: (eventIds, start) => db.registration.count({ where: { eventId: { in: eventIds }, status: "CONFIRMED", createdAt: { gte: start } } }),
    countPageViews: (eventIds, start) => db.pageViewEvent.count({ where: { entityType: "EVENT", entityId: { in: eventIds }, occurredAt: { gte: start } } }),
    listTopEvents: async (eventIds, start) => {
      const rows = await db.registration.findMany({
        where: { eventId: { in: eventIds }, status: "CONFIRMED", createdAt: { gte: start } },
        select: { eventId: true, event: { select: { title: true } } },
      });
      const counts = new Map<string, { title: string; count: number }>();
      for (const row of rows) {
        const current = counts.get(row.eventId) ?? { title: row.event.title, count: 0 };
        current.count += 1;
        counts.set(row.eventId, current);
      }
      return Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((item) => ({ event: { title: item.title }, _count: { _all: item.count } }));
    },
    now: () => new Date(),
  });
}
