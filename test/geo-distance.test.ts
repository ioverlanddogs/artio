import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm } from "../lib/geo.ts";

test("distanceKm returns expected approximate 1-degree longitude distance at equator", () => {
  const result = distanceKm(0, 0, 0, 1);
  assert.equal(result > 110 && result < 112.5, true);
});

test("distanceKm is zero for identical points", () => {
  assert.equal(distanceKm(51.5, -2.6, 51.5, -2.6), 0);
});
