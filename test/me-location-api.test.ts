import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PUT as putLocation } from "../app/api/me/location/route.ts";
import { locationPreferenceSchema } from "../lib/validators.ts";

test("PUT /api/me/location returns 500 when auth session lookup fails unexpectedly", async () => {
  const req = new NextRequest("http://localhost/api/me/location", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locationLabel: "Bristol", lat: 51.45, lng: -2.58, radiusKm: 25 }),
  });

  const res = await putLocation(req);
  assert.equal(res.status, 500);
});

test("location validation rejects invalid lat/lng/radius", () => {
  assert.equal(locationPreferenceSchema.safeParse({ lat: 91, lng: 0, radiusKm: 25 }).success, false);
  assert.equal(locationPreferenceSchema.safeParse({ lat: 0, lng: 181, radiusKm: 25 }).success, false);
  assert.equal(locationPreferenceSchema.safeParse({ lat: 0, lng: 0, radiusKm: 0 }).success, false);
  assert.equal(locationPreferenceSchema.safeParse({ lat: 0, radiusKm: 25 }).success, false);
});
