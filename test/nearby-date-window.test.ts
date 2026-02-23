import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getNearby } from "../app/api/events/nearby/route.ts";
import { db } from "../lib/db.ts";

const baseEvent = {
  id: "evt_1",
  lat: 51.5,
  lng: -2.6,
  startAt: new Date("2026-03-01T10:00:00.000Z"),
  endAt: new Date("2026-03-01T11:00:00.000Z"),
  venue: { name: "Venue", slug: "venue", city: "Bristol", lat: 51.5, lng: -2.6 },
  images: [],
  eventTags: [],
};

test("GET /api/events/nearby defaults dateFrom to start of day", async () => {
  const originalFindMany = db.event.findMany;
  const RealDate = Date;
  const fixedNow = new RealDate("2026-03-15T15:45:12.000Z");

  let whereValue: any;
  db.event.findMany = (async (args) => {
    whereValue = args.where;
    return [baseEvent] as any;
  }) as typeof db.event.findMany;

  class MockDate extends RealDate {
    constructor(value?: string | number | Date) {
      if (value !== undefined) {
        super(value);
      } else {
        super(fixedNow);
      }
    }

    static now() {
      return fixedNow.getTime();
    }
  }

  (globalThis as any).Date = MockDate;

  try {
    const req = new NextRequest("http://localhost/api/events/nearby?lat=51.5&lng=-2.6&radiusKm=10");
    const res = await getNearby(req);
    assert.equal(res.status, 200);

    const dateFilter = whereValue.AND[1].OR[1];
    assert.equal(dateFilter.endAt, null);
    assert.equal(dateFilter.startAt.gte.toISOString(), "2026-03-15T00:00:00.000Z");
  } finally {
    (globalThis as any).Date = RealDate;
    db.event.findMany = originalFindMany;
  }
});

test("GET /api/events/nearby uses overlap date-window predicate", async () => {
  const originalFindMany = db.event.findMany;

  let whereValue: any;
  db.event.findMany = (async (args) => {
    whereValue = args.where;
    return [baseEvent] as any;
  }) as typeof db.event.findMany;

  try {
    const req = new NextRequest("http://localhost/api/events/nearby?lat=51.5&lng=-2.6&radiusKm=10&from=2026-03-01T00:00:00.000Z&to=2026-03-02T00:00:00.000Z");
    const res = await getNearby(req);
    assert.equal(res.status, 200);

    assert.deepEqual(whereValue.AND[0], { startAt: { lte: new Date("2026-03-02T00:00:00.000Z") } });
    assert.deepEqual(whereValue.AND[1], {
      OR: [
        { endAt: { gte: new Date("2026-03-01T00:00:00.000Z") } },
        { endAt: null, startAt: { gte: new Date("2026-03-01T00:00:00.000Z") } },
      ],
    });
  } finally {
    db.event.findMany = originalFindMany;
  }
});
