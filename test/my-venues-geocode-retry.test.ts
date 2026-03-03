import test from "node:test";
import assert from "node:assert/strict";
import { ForwardGeocodeError } from "@/lib/geocode/forward";
import { geocodeForVenueUpdate } from "@/lib/venues/venue-geocode-flow";

test("manual retry flow returns coordinates for lat/lng null venue", async () => {
  const result = await geocodeForVenueUpdate({
    existing: {
      addressLine1: "1 Queen Square",
      city: "Bristol",
      postcode: "BS1 4JQ",
      country: "UK",
      lat: null,
      lng: null,
    },
    patch: { city: "Bristol" },
  }, async () => ({ lat: 51.4545, lng: -2.5879 }));

  assert.deepEqual(result, { lat: 51.4545, lng: -2.5879 });
});

test("manual retry flow surfaces provider timeout", async () => {
  await assert.rejects(
    geocodeForVenueUpdate({
      existing: { addressLine1: "1 Queen Square", city: "Bristol", postcode: "BS1 4JQ", country: "UK", lat: null, lng: null },
      patch: { postcode: "BS1 4JQ" },
    }, async () => { throw new ForwardGeocodeError("provider_timeout", "timeout"); }),
  );
});
