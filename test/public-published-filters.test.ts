import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public events and venues queries enforce isPublished=true", () => {
  const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
  const venuesRoute = readFileSync("app/api/venues/route.ts", "utf8");

  assert.match(eventsRoute, /isPublished: true/);
  assert.match(venuesRoute, /isPublished: true/);
});
