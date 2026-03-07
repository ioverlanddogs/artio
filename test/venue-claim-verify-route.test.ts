import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("verify route enqueues VENUE_CLAIM_APPROVED after successful verification", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/verify/route.ts", "utf8");
  assert.match(source, /type:\s*"VENUE_CLAIM_APPROVED"/);
  assert.match(source, /venue-claim-approved-\$\{result\.venueId\}-\$\{user\.id\}/);
});
