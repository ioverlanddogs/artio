import test from "node:test";
import assert from "node:assert/strict";
import { ForwardGeocodeError } from "@/lib/geocode/forward";
import { geocodeForVenueUpdate, geocodeForVenueUpdateBestEffort } from "@/lib/venues/venue-geocode-flow";

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

test("best-effort update geocode never throws when provider fails", async () => {
  let warned = "";
  const result = await geocodeForVenueUpdateBestEffort({
    existing: { id: "ven_1", addressLine1: "1 Old", city: "Old city", postcode: "OLD", country: "UK", lat: 33, lng: 44 },
    patch: { city: "Bath" },
  }, async () => { throw new ForwardGeocodeError("provider_error", "down"); }, (message) => {
    warned = message;
  });

  assert.equal(result, null);
  assert.match(warned, /my_venue_update_geocode_failed/);
});

test("best-effort geocode is skipped when address fields are unchanged", async () => {
  let called = false;
  const result = await geocodeForVenueUpdateBestEffort({
    existing: { addressLine1: "1 Old", city: "Old city", postcode: "OLD", country: "UK", lat: 33, lng: 44 },
    patch: {},
  }, async () => {
    called = true;
    return { lat: 1, lng: 2 };
  });

  assert.equal(result, null);
  assert.equal(called, false);
});
