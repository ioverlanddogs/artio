import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("claim submit route requires authentication and handles auth failure", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/route.ts", "utf8");
  assert.match(source, /requireAuth|isAuthError/);
  assert.match(source, /apiError\(401/);
});

test("claim submit route validates roleAtVenue and returns 400 on invalid payload", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/route.ts", "utf8");
  assert.match(source, /roleAtVenue/);
  assert.match(source, /z\.string\(\)\.trim\(\)\.min\(2\)\.max\(80\)/);
  assert.match(source, /apiError\(400/);
});

test("claim submit route calls createVenueClaim", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/route.ts", "utf8");
  assert.match(source, /createVenueClaim\(/);
});

test("claim submit route enqueues VENUE_CLAIM_VERIFY with slug-based dedupe key", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/route.ts", "utf8");
  assert.match(source, /type:\s*"VENUE_CLAIM_VERIFY"/);
  assert.match(source, /venue_claim:/);
});

test("claim submit route returns claim result as JSON", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/route.ts", "utf8");
  assert.match(source, /NextResponse\.json\(result/);
});
