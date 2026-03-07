import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";

type SessionUser = { id: string };

type DailyRow = { day: Date; _count: { _all: number } };
type TopEventRow = { event: { title: string }; _count: { _all: number } };

type Deps = {
  requireAuth: () => Promise<SessionUser>;
  hasVenueMembership: (userId: string) => Promise<boolean>;
  listManagedEventIds: (userId: string) => Promise<string[]>;
  listDailyRegistrationCounts: (eventIds: string[], start: Date) => Promise<DailyRow[]>;
  countConfirmedRegistrations: (eventIds: string[], start: Date) => Promise<number>;
  countPageViews: (eventIds: string[], start: Date) => Promise<number>;
  listTopEvents: (eventIds: string[], start: Date) => Promise<TopEventRow[]>;
  now: () => Date;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function handleGetMyAnalyticsRegistrations(deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const isPublisher = await deps.hasVenueMembership(user.id);
    if (!isPublisher) return apiError(403, "forbidden", "Venue membership required");

    const end = startOfUtcDay(deps.now());
    const start = addDays(end, -29);

    const eventIds = await deps.listManagedEventIds(user.id);
    if (!eventIds.length) return NextResponse.json({ dailyCounts: [], conversionRate: 0, topEvents: [] }, { headers: { "Cache-Control": "no-store" } });

    const [dailyRows, totalConfirmed, totalViews, topRows] = await Promise.all([
      deps.listDailyRegistrationCounts(eventIds, start),
      deps.countConfirmedRegistrations(eventIds, start),
      deps.countPageViews(eventIds, start),
      deps.listTopEvents(eventIds, start),
    ]);

    const countsByDay = new Map<string, number>();
    for (const row of dailyRows) {
      const key = formatDay(row.day);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + row._count._all);
    }

    const dailyCounts = Array.from({ length: 30 }).map((_, index) => {
      const date = formatDay(addDays(start, index));
      return { date, count: countsByDay.get(date) ?? 0 };
    });

    return NextResponse.json({
      dailyCounts,
      conversionRate: totalViews > 0 ? totalConfirmed / totalViews : 0,
      topEvents: topRows.map((row) => ({ eventTitle: row.event.title, count: row._count._all })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
