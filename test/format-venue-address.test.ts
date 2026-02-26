import test from "node:test";
import assert from "node:assert/strict";
import { formatVenueAddress } from "@/lib/venues/format-venue-address";

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
