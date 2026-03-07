import test from "node:test";
import assert from "node:assert/strict";
import { handleGetMyAnalyticsRegistrations } from "@/lib/my-analytics-registrations-route";

test("analytics registrations route requires auth", async () => {
  const res = await handleGetMyAnalyticsRegistrations({
    requireAuth: async () => { throw new Error("unauthorized"); },
    hasVenueMembership: async () => true,
    listManagedEventIds: async () => [],
    listDailyRegistrationCounts: async () => [],
    countConfirmedRegistrations: async () => 0,
    countPageViews: async () => 0,
    listTopEvents: async () => [],
    now: () => new Date("2026-05-10T12:00:00.000Z"),
  });
  assert.equal(res.status, 401);
});

test("analytics registrations returns dailyCounts conversionRate and topEvents", async () => {
  const res = await handleGetMyAnalyticsRegistrations({
    requireAuth: async () => ({ id: "user-1" }),
    hasVenueMembership: async () => true,
    listManagedEventIds: async () => ["event-1"],
    listDailyRegistrationCounts: async () => [{ day: new Date("2026-05-01T00:00:00.000Z"), _count: { _all: 3 } }],
    countConfirmedRegistrations: async () => 15,
    countPageViews: async () => 60,
    listTopEvents: async () => [{ event: { title: "Spring Open" }, _count: { _all: 9 } }],
    now: () => new Date("2026-05-10T12:00:00.000Z"),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(Array.isArray(body.dailyCounts), true);
  assert.equal(body.dailyCounts.length, 30);
  assert.equal(body.conversionRate, 0.25);
  assert.deepEqual(body.topEvents[0], { eventTitle: "Spring Open", count: 9 });
});
