import test from "node:test";
import assert from "node:assert/strict";
import { geocodeForVenueCreate } from "@/lib/venues/venue-geocode-flow";

test("create geocode flow returns lat/lng when Mapbox has a match", async () => {
  const result = await geocodeForVenueCreate({
    addressLine1: "1 Queen Square",
    city: "Bristol",
    postcode: "BS1 4JQ",
    country: "UK",
  }, async () => ({ lat: 51.4545, lng: -2.5879 }));

  assert.deepEqual(result, { lat: 51.4545, lng: -2.5879 });
});

test("create geocode flow allows null coordinates when provider returns no match", async () => {
  const result = await geocodeForVenueCreate({
    addressLine1: "Unknown",
    city: "Nowhere",
    country: "UK",
  }, async () => null);

  assert.deepEqual(result, { lat: null, lng: null });
});
