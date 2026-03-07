import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowVenueClaimCta } from "@/lib/venue-claims/cta";

test("CTA hidden when memberships exist", () => {
  assert.equal(
    shouldShowVenueClaimCta({ claimStatus: "UNCLAIMED", aiGenerated: false, membershipsCount: 1, isCurrentUserMember: false }),
    false
  );
});

test("CTA hidden when not AI-generated and memberships > 0", () => {
  assert.equal(
    shouldShowVenueClaimCta({ claimStatus: "PENDING", aiGenerated: false, membershipsCount: 2, isCurrentUserMember: false }),
    false
  );
});

test("CTA shown when aiGenerated and no memberships", () => {
  assert.equal(
    shouldShowVenueClaimCta({ claimStatus: "UNCLAIMED", aiGenerated: true, membershipsCount: 0, isCurrentUserMember: false }),
    true
  );
});
