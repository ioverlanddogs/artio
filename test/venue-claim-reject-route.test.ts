import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("reject route resets claimStatus to UNCLAIMED and enqueues rejected notification", () => {
  const source = readFileSync("app/api/admin/venue-claims/[id]/reject/route.ts", "utf8");
  assert.match(source, /rejectClaim\(/);
  assert.match(source, /type:\s*"VENUE_CLAIM_REJECTED"/);
  assert.match(source, /venue-claim-rejected-\$\{claim\.id\}/);
});

test("reject route persists optional rejection reason", () => {
  const source = readFileSync("app/api/admin/venue-claims/[id]/reject/route.ts", "utf8");
  assert.match(source, /const reason = typeof body\?\.reason === "string"/);
  assert.match(source, /rejectionReason/);
  assert.match(source, /rejectClaim\(db as never, id, rejectionReason, new Date\(\)\)/);
});

test("reject route includes reason in rejected notification payload", () => {
  const source = readFileSync("app/api/admin/venue-claims/[id]/reject/route.ts", "utf8");
  assert.match(source, /payload:\s*\{[^}]*reason: rejectionReason[^}]*\}/s);
});

test("reject route returns 404 on missing claim", () => {
  const source = readFileSync("app/api/admin/venue-claims/[id]/reject/route.ts", "utf8");
  assert.match(source, /apiError\(404,\s*"not_found",\s*"Claim not found"\)/);
});
