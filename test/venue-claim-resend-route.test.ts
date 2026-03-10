import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("claim resend route requires authentication and handles auth failure", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /requireAuth|isAuthError/);
  assert.match(source, /apiError\(401/);
});

test("claim resend route calls resendClaimToken", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /resendClaimToken\(/);
});

test("claim resend route returns 404 when no pending claim", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /apiError\(404/);
});

test("claim resend route returns 429 on cooldown", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /apiError\(429/);
});

test("claim resend route enqueues VENUE_CLAIM_VERIFY with resend dedupe key", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /type:\s*"VENUE_CLAIM_VERIFY"/);
  assert.match(source, /venue_claim_resend:/);
});

test("claim resend route returns expiresAt in response", () => {
  const source = readFileSync("app/api/venues/[slug]/claim/resend/route.ts", "utf8");
  assert.match(source, /expiresAt/);
});
