import test from "node:test";
import assert from "node:assert/strict";
import { geocodeVenueAddressToLatLng } from "@/lib/geocode/google-forward";
import { ForwardGeocodeError } from "@/lib/geocode/forward";

test("google geocode uses fallback queries until status OK with location", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "google-test-key";

  const requests: URL[] = [];
  const originalFetch = global.fetch;
  global.fetch = (async (input) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw);
    requests.push(url);

    if (requests.length === 1) {
      return new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), { status: 200 });
    }

    return new Response(JSON.stringify({
      status: "OK",
      results: [{ geometry: { location: { lat: 51.5007, lng: -0.1246 } } }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await geocodeVenueAddressToLatLng({
      queryTexts: ["unknown", "Westminster, London"],
      countryCode: "GB",
    });

    assert.deepEqual(result, { lat: 51.5007, lng: -0.1246 });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].origin + requests[0].pathname, "https://maps.googleapis.com/maps/api/geocode/json");
    assert.equal(requests[1].searchParams.get("key"), "google-test-key");
    assert.equal(requests[1].searchParams.get("address"), "Westminster, London");
    assert.equal(requests[1].searchParams.get("components"), "country:GB");
  } finally {
    global.fetch = originalFetch;
  }
});

test("google geocode omits components when countryCode is invalid", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "google-test-key";

  const originalFetch = global.fetch;
  global.fetch = (async (input) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw);
    assert.equal(url.searchParams.get("components"), null);
    return new Response(JSON.stringify({
      status: "OK",
      results: [{ geometry: { location: { lat: 10, lng: 11 } } }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await geocodeVenueAddressToLatLng({ addressText: "Berlin", countryCode: "DEU" });
    assert.deepEqual(result, { lat: 10, lng: 11 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("google geocode throws not_configured when key is missing", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  await assert.rejects(
    geocodeVenueAddressToLatLng({ addressText: "London" }),
    (error: unknown) => error instanceof ForwardGeocodeError && error.code === "not_configured",
  );
});

test("google geocode throws rate_limited on OVER_QUERY_LIMIT", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "google-test-key";

  const originalFetch = global.fetch;
  global.fetch = (async () => new Response(JSON.stringify({ status: "OVER_QUERY_LIMIT" }), { status: 200 })) as typeof fetch;

  try {
    await assert.rejects(
      geocodeVenueAddressToLatLng({ addressText: "London" }),
      (error: unknown) => error instanceof ForwardGeocodeError && error.code === "rate_limited",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("google geocode throws provider_error on non-ok HTTP status", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "google-test-key";

  const originalFetch = global.fetch;
  global.fetch = (async () => new Response("down", { status: 403 })) as typeof fetch;

  try {
    await assert.rejects(
      geocodeVenueAddressToLatLng({ addressText: "London" }),
      (error: unknown) => error instanceof ForwardGeocodeError && error.code === "provider_error" && error.status === 403,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("google geocode throws provider_error on invalid JSON", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "google-test-key";

  const originalFetch = global.fetch;
  global.fetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;

  try {
    await assert.rejects(
      geocodeVenueAddressToLatLng({ addressText: "London" }),
      (error: unknown) => error instanceof ForwardGeocodeError && error.code === "provider_error",
    );
  } finally {
    global.fetch = originalFetch;
  }
});
