#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import tzLookup from "tz-lookup";

const prisma = new PrismaClient();
const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE ?? "500", 10);

async function main() {
  let cursor;
  let scanned = 0;
  let updated = 0;
  let warnings = 0;

  while (true) {
    const venues = await prisma.venue.findMany({
      where: { lat: { not: null }, lng: { not: null }, timezone: null },
      select: { id: true, lat: true, lng: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (venues.length === 0) break;

    for (const venue of venues) {
      scanned += 1;
      if (typeof venue.lat !== "number" || typeof venue.lng !== "number") continue;
      try {
        const timezone = tzLookup(venue.lat, venue.lng);
        await prisma.venue.update({ where: { id: venue.id }, data: { timezone } });
        updated += 1;
      } catch {
        warnings += 1;
        console.warn(`[backfill-venue-timezones] timezone_lookup_failed venueId=${venue.id}`);
      }
    }

    cursor = venues[venues.length - 1]?.id;
  }

  console.log(JSON.stringify({ ok: true, scanned, updated, warnings }, null, 2));
}

main()
  .catch((error) => {
    console.error("[backfill-venue-timezones] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
