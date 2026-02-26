import test from "node:test";
import assert from "node:assert/strict";
import { MapboxForwardGeocodeError } from "@/lib/geocode/mapbox-forward";
import { geocodeForVenueUpdate } from "@/lib/venues/venue-geocode-flow";

test("update geocode flow refreshes coordinates when address changes", async () => {
  const result = await geocodeForVenueUpdate({
    existing: {
      addressLine1: "Old 1",
      city: "Old city",
      postcode: "OLD",
      country: "UK",
      lat: 1,
      lng: 2,
    },
    patch: { city: "Bristol", postcode: "BS1 4JQ" },
  }, async () => ({ lat: 51.4545, lng: -2.5879 }));

  assert.deepEqual(result, { lat: 51.4545, lng: -2.5879 });
});

test("update geocode flow can preserve existing coordinates when provider fails", async () => {
  await assert.rejects(
    geocodeForVenueUpdate({
      existing: { addressLine1: "1 Old", city: "Old city", postcode: "OLD", country: "UK", lat: 33, lng: 44 },
      patch: { city: "Bath" },
    }, async () => { throw new MapboxForwardGeocodeError("provider_error", "down"); }),
  );
});
