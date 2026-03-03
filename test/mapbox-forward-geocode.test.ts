import test from "node:test";
import assert from "node:assert/strict";
import { geocodeVenueAddressToLatLng, MapboxForwardGeocodeError } from "@/lib/geocode/mapbox-forward";

test("geocodeVenueAddressToLatLng returns lat/lng from v6 response", async () => {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";

  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({
    features: [{ geometry: { coordinates: [-2.5879, 51.4545] } }],
  }), { status: 200 })) as typeof fetch;

  try {
    const result = await geocodeVenueAddressToLatLng({
      addressText: "1 Queen Square, Bristol, BS1 4JQ, UK",
      countryCode: "GB",
    });

    assert.deepEqual(result, { lat: 51.4545, lng: -2.5879 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("geocodeVenueAddressToLatLng uses fallback queries until a feature is found", async () => {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";

  const requestedUrls: URL[] = [];
  const originalFetch = global.fetch;
  global.fetch = (async (input) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw);
    requestedUrls.push(url);

    if (requestedUrls.length === 1) {
      return new Response(JSON.stringify({ features: [] }), { status: 200 });
    }

    return new Response(JSON.stringify({
      features: [{ geometry: { coordinates: [-2.1001, 51.5002] } }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await geocodeVenueAddressToLatLng({
      queryTexts: ["1 Unknown Road, Bristol, BS1 4JQ, UK", "Art Club, Bristol, BS1 4JQ, UK", "BS1 4JQ, UK"],
      countryCode: "GB",
    });

    assert.deepEqual(result, { lat: 51.5002, lng: -2.1001 });
    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls[0].searchParams.get("q"), "1 Unknown Road, Bristol, BS1 4JQ, UK");
    assert.equal(requestedUrls[1].searchParams.get("q"), "Art Club, Bristol, BS1 4JQ, UK");
    assert.equal(requestedUrls[1].searchParams.get("limit"), "1");
    assert.equal(requestedUrls[1].searchParams.get("types"), "address,poi,place,postcode");
    assert.equal(requestedUrls[1].searchParams.get("autocomplete"), "false");
    assert.equal(requestedUrls[1].searchParams.get("country"), "GB");
  } finally {
    global.fetch = originalFetch;
  }
});

test("geocodeVenueAddressToLatLng throws provider_timeout on timeout", async () => {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";

  const originalFetch = global.fetch;
  global.fetch = (async () => { throw new DOMException("signal", "AbortError"); }) as typeof fetch;

  try {
    await assert.rejects(
      geocodeVenueAddressToLatLng({ addressText: "10 Downing St, London, SW1A 2AA, UK", countryCode: "GB" }),
      (error: unknown) => error instanceof MapboxForwardGeocodeError && error.code === "provider_timeout",
    );
  } finally {
    global.fetch = originalFetch;
  }
});
