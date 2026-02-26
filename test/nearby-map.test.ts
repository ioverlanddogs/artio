import test from "node:test";
import assert from "node:assert/strict";
import { getMarkerItems, resolveNearbyView } from "../lib/nearby-map.ts";

test("nearby view toggle resolves expected query values", () => {
  assert.equal(resolveNearbyView("list"), "list");
  assert.equal(resolveNearbyView("map"), "map");
  assert.equal(resolveNearbyView("invalid"), "list");
  assert.equal(resolveNearbyView(undefined), "list");
});

test("map marker input excludes items without coordinates", () => {
  const items = [
    { id: "evt_1", slug: "one", kind: "event", title: "One", startAt: "2026-01-01T00:00:00.000Z", venueName: "A", lat: 40, lng: -73 },
    { id: "evt_2", slug: "two", kind: "event", title: "Two", startAt: "2026-01-01T00:00:00.000Z", venueName: "B", lat: null, lng: -73 },
    { id: "ven_1", slug: "venue", kind: "venue", name: "Venue", city: "Bristol", lat: 41, lng: -74 },
  ];

  const { markers, omittedCount } = getMarkerItems(items, 10);
  assert.equal(markers.length, 2);
  assert.deepEqual(markers.map((marker) => marker.id), ["evt_1", "ven_1"]);
  assert.equal(omittedCount, 0);
});
