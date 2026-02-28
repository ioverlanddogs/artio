import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public events and venues queries enforce canonical published status with legacy fallback", () => {
  const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
  const venuesRoute = readFileSync("app/api/venues/route.ts", "utf8");
  const publishStatus = readFileSync("lib/publish-status.ts", "utf8");

  assert.match(eventsRoute, /publishedEventWhere/);
  assert.match(venuesRoute, /publishedVenueWhere/);
  assert.match(publishStatus, /status: PUBLISHED_STATUS/);
  assert.match(publishStatus, /isPublished: true/);
});
