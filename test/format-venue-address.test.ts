import test from "node:test";
import assert from "node:assert/strict";
import { buildVenueGeocodeQueries, formatVenueAddress, normalizeCountryCode } from "@/lib/venues/format-venue-address";

test("formatVenueAddress joins non-empty parts", () => {
  const result = formatVenueAddress({
    addressLine1: "1 Queen Square",
    city: "Bristol",
    postcode: "BS1 4JQ",
    country: "UK",
  });

  assert.equal(result, "1 Queen Square, Bristol, BS1 4JQ, UK");
});

test("formatVenueAddress skips blank values", () => {
  const result = formatVenueAddress({
    addressLine1: "",
    addressLine2: " ",
    city: "Bath",
    country: "UK",
  });

  assert.equal(result, "Bath, UK");
});

test("buildVenueGeocodeQueries builds the fallback ladder", () => {
  const result = buildVenueGeocodeQueries({
    name: "The Place",
    addressLine1: "1 Queen Square",
    city: "Bristol",
    postcode: "BS1 4JQ",
    country: "UK",
  });

  assert.deepEqual(result, [
    "1 Queen Square, Bristol, BS1 4JQ, UK",
    "The Place, Bristol, BS1 4JQ, UK",
    "BS1 4JQ, UK",
    "Bristol, UK",
  ]);
});


test("normalizeCountryCode only returns valid ISO alpha-2 codes", () => {
  assert.equal(normalizeCountryCode("UK"), "GB");
  assert.equal(normalizeCountryCode("gb"), "GB");
  assert.equal(normalizeCountryCode("ZZ"), undefined);
  assert.equal(normalizeCountryCode("QZ"), undefined);
});
