import test from "node:test";
import assert from "node:assert/strict";
import { geocodeVenueAddressToLatLng, MapboxForwardGeocodeError } from "@/lib/geocode/mapbox-forward";

test("geocodeVenueAddressToLatLng returns lat/lng from v6 response", async () => {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";

  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({
    features: [{ geometry: { coordinates: [-2.5879, 51.4545] } }],
  }), { status: 200 })) as typeof fetch;

  const result = await geocodeVenueAddressToLatLng({
    addressText: "1 Queen Square, Bristol, BS1 4JQ, UK",
    countryCode: "GB",
  });

  global.fetch = originalFetch;
  assert.deepEqual(result, { lat: 51.4545, lng: -2.5879 });
});

test("geocodeVenueAddressToLatLng throws provider_timeout on timeout", async () => {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";

  const originalFetch = global.fetch;
  global.fetch = (async () => { throw new DOMException("signal", "AbortError"); }) as typeof fetch;

  await assert.rejects(
    geocodeVenueAddressToLatLng({ addressText: "10 Downing St, London, SW1A 2AA, UK", countryCode: "GB" }),
    (error: unknown) => error instanceof MapboxForwardGeocodeError && error.code === "provider_timeout",
  );

  global.fetch = originalFetch;
});
