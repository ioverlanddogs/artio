import test from "node:test";
import assert from "node:assert/strict";
import { approveClaim, createVenueClaim, rejectClaim, revokeClaim, verifyVenueClaim } from "../lib/venue-claims/service";

test("createVenueClaim uses manual review when contact email missing", async () => {
  const createdClaims: Array<Record<string, unknown>> = [];
  let claimStatus: string | null = null;

  const db = {
    venue: {
      findUnique: async () => ({ id: "venue-1", slug: "venue-a", name: "Venue A", contactEmail: null, claimStatus: "UNCLAIMED" as const }),
      update: async ({ data }) => {
        claimStatus = data.claimStatus;
        return { id: "venue-1" };
      },
    },
    venueClaimRequest: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdClaims.push(data);
        return { id: "claim-1", status: "PENDING_VERIFICATION" as const, expiresAt: null, venueId: "venue-1" };
      },
      update: async () => ({ id: "claim-1" }),
    },
    venueMembership: { upsert: async () => ({ id: "membership-1" }), deleteMany: async () => ({ count: 0 }) },
    $transaction: async (fn) => fn(db as never),
  };

  const result = await createVenueClaim({
    slug: "venue-a",
    userId: "user-1",
    roleAtVenue: "Owner",
    db: db as never,
    notify: async () => {
      throw new Error("should not send");
    },
  });

  assert.equal(result.delivery, "MANUAL_REVIEW");
  assert.equal(claimStatus, "PENDING");
  assert.equal(createdClaims.length, 1);
});

test("verifyVenueClaim marks verified and returns redirect", async () => {
  let membershipUpserted = false;
  let venueClaimed = false;
  let claimVerified = false;

  const token = "x".repeat(48);
  const crypto = await import("node:crypto");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const tx = {
    venueClaimRequest: {
      findFirst: async () => ({ id: "claim-1", venueId: "venue-1", userId: "user-1" }),
      findUnique: async () => ({ id: "claim-1", venueId: "venue-1", userId: "user-1" }),
      create: async () => ({ id: "claim-1", status: "PENDING_VERIFICATION" as const, expiresAt: null, venueId: "venue-1" }),
      update: async () => {
        claimVerified = true;
        return { id: "claim-1" };
      },
    },
    venueMembership: {
      upsert: async () => {
        membershipUpserted = true;
        return { id: "membership-1" };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    venue: {
      findUnique: async () => ({ id: "venue-1", slug: "venue-a", name: "Venue A", contactEmail: "v@example.com", claimStatus: "PENDING" as const }),
      update: async () => {
        venueClaimed = true;
        return { id: "venue-1" };
      },
    },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await verifyVenueClaim({
    db: {
      ...tx,
      venueClaimRequest: {
        ...tx.venueClaimRequest,
        findFirst: async ({ where }: { where: { tokenHash?: string } }) => {
          if (where.tokenHash && where.tokenHash !== tokenHash) return null;
          return { id: "claim-1", venueId: "venue-1", userId: "user-1" };
        },
      },
    } as never,
    slug: "venue-a",
    token,
  });

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.redirectTo, "/my/venues/venue-1");
  assert.equal(membershipUpserted, true);
  assert.equal(venueClaimed, true);
  assert.equal(claimVerified, true);
});

test("approveClaim creates membership and marks claim verified", async () => {
  let membershipUpserted = false;
  let claimUpdated = false;
  let venueUpdated = false;

  const tx = {
    venueClaimRequest: {
      findUnique: async () => ({ id: "claim-10", venueId: "venue-10", userId: "user-10", status: "PENDING_VERIFICATION", expiresAt: null }),
      findFirst: async () => null,
      create: async () => ({ id: "claim-10", venueId: "venue-10", status: "PENDING_VERIFICATION", expiresAt: null }),
      update: async () => {
        claimUpdated = true;
        return { id: "claim-10" };
      },
    },
    venueMembership: {
      upsert: async () => {
        membershipUpserted = true;
        return { id: "membership-10" };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    venue: {
      findUnique: async () => null,
      update: async () => {
        venueUpdated = true;
        return { id: "venue-10" };
      },
    },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await approveClaim(tx as never, "claim-10", new Date());

  assert.equal(result?.id, "claim-10");
  assert.equal(membershipUpserted, true);
  assert.equal(claimUpdated, true);
  assert.equal(venueUpdated, true);
});

test("approveClaim on non-existent claim returns null", async () => {
  const tx = {
    venueClaimRequest: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => ({ id: "claim-11", venueId: "venue-11", status: "PENDING_VERIFICATION", expiresAt: null }),
      update: async () => ({ id: "claim-11" }),
    },
    venueMembership: { upsert: async () => ({ id: "membership-11" }), deleteMany: async () => ({ count: 0 }) },
    venue: { findUnique: async () => null, update: async () => ({ id: "venue-11" }) },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await approveClaim(tx as never, "missing-claim", new Date());
  assert.equal(result, null);
});

test("createVenueClaim expires stale active claim then allows new claim", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  let expiredUpdated = false;
  const venueStatuses: string[] = [];

  const db = {
    venue: {
      findUnique: async () => ({ id: "venue-2", slug: "venue-b", name: "Venue B", contactEmail: null, claimStatus: "PENDING" as const }),
      update: async ({ data }) => {
        venueStatuses.push(data.claimStatus);
        return { id: "venue-2" };
      },
    },
    venueClaimRequest: {
      findFirst: async ({ where }) => {
        if (where.userId) return null;
        return { id: "old-claim", venueId: "venue-2", status: "PENDING_VERIFICATION", expiresAt: new Date(now.getTime() - 1000) };
      },
      create: async () => ({ id: "new-claim", status: "PENDING_VERIFICATION" as const, expiresAt: null, venueId: "venue-2" }),
      update: async ({ where, data }) => {
        if (where.id === "old-claim" && data.status === "EXPIRED") expiredUpdated = true;
        return { id: where.id };
      },
    },
    venueMembership: { upsert: async () => ({ id: "membership-2" }), deleteMany: async () => ({ count: 0 }) },
    $transaction: async (fn) => fn(db as never),
  };

  const result = await createVenueClaim({
    slug: "venue-b",
    userId: "user-2",
    roleAtVenue: "Manager",
    now,
    db: db as never,
    notify: async () => {
      throw new Error("should not notify");
    },
  });

  assert.equal(expiredUpdated, true);
  assert.deepEqual(venueStatuses, ["UNCLAIMED", "PENDING"]);
  assert.equal(result.claimId, "new-claim");
});

test("createVenueClaim keeps blocking when active claim is not expired", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const db = {
    venue: {
      findUnique: async () => ({ id: "venue-3", slug: "venue-c", name: "Venue C", contactEmail: null, claimStatus: "PENDING" as const }),
      update: async () => ({ id: "venue-3" }),
    },
    venueClaimRequest: {
      findFirst: async ({ where }) => {
        if (where.userId) return null;
        return { id: "active-claim", venueId: "venue-3", status: "PENDING_VERIFICATION", expiresAt: new Date(now.getTime() + 60_000) };
      },
      create: async () => ({ id: "new-claim", status: "PENDING_VERIFICATION" as const, expiresAt: null, venueId: "venue-3" }),
      update: async () => ({ id: "active-claim" }),
    },
    venueMembership: { upsert: async () => ({ id: "membership-3" }), deleteMany: async () => ({ count: 0 }) },
    $transaction: async (fn) => fn(db as never),
  };

  await assert.rejects(
    () =>
      createVenueClaim({
        slug: "venue-c",
        userId: "user-3",
        roleAtVenue: "Owner",
        now,
        db: db as never,
        notify: async () => {
          throw new Error("should not notify");
        },
      }),
    /claim_pending/
  );
});

test("resendClaimToken returns new token", async () => {
  const { resendClaimToken } = await import("../lib/venue-claims/service");
  let updatedTokenHash: string | null = null;
  let updatedExpiresAt: Date | null = null;

  const now = new Date("2026-01-01T00:00:00.000Z");
  const result = await resendClaimToken({
    slug: "venue-resend",
    userId: "user-r",
    now,
    db: {
      venue: {
        findUnique: async () => ({ id: "venue-r", slug: "venue-resend", name: "Venue Resend", contactEmail: "owner@example.com", claimStatus: "PENDING" as const }),
        update: async () => ({ id: "venue-r" }),
      },
      venueClaimRequest: {
        findFirst: async () => ({ id: "claim-r", venueId: "venue-r", userId: "user-r", status: "PENDING_VERIFICATION" as const, expiresAt: null, updatedAt: new Date(now.getTime() - 10 * 60_000) }),
        create: async () => ({ id: "claim-r", venueId: "venue-r", status: "PENDING_VERIFICATION" as const, expiresAt: null }),
        update: async ({ data }: { data: { tokenHash: string; expiresAt: Date } }) => {
          updatedTokenHash = data.tokenHash;
          updatedExpiresAt = data.expiresAt;
          return { id: "claim-r", expiresAt: data.expiresAt };
        },
      },
      venueMembership: { upsert: async () => ({ id: "m-r" }), deleteMany: async () => ({ count: 0 }) },
      $transaction: async (fn) => fn({} as never),
    } as never,
  });

  assert.equal("error" in result, false);
  assert.equal(result.claimId, "claim-r");
  assert.equal(result.toEmail, "owner@example.com");
  assert.ok(typeof result.token === "string" && result.token.length > 10);
  assert.ok(updatedTokenHash);
  assert.ok(updatedExpiresAt);
});

test("resendClaimToken returns cooldown error within 5 minutes", async () => {
  const { resendClaimToken } = await import("../lib/venue-claims/service");
  const now = new Date("2026-01-01T00:00:00.000Z");
  const result = await resendClaimToken({
    slug: "venue-resend",
    userId: "user-r",
    now,
    db: {
      venue: {
        findUnique: async () => ({ id: "venue-r", slug: "venue-resend", name: "Venue Resend", contactEmail: "owner@example.com", claimStatus: "PENDING" as const }),
        update: async () => ({ id: "venue-r" }),
      },
      venueClaimRequest: {
        findFirst: async () => ({ id: "claim-r", venueId: "venue-r", userId: "user-r", status: "PENDING_VERIFICATION" as const, expiresAt: null, updatedAt: new Date(now.getTime() - 2 * 60_000) }),
        create: async () => ({ id: "claim-r", venueId: "venue-r", status: "PENDING_VERIFICATION" as const, expiresAt: null }),
        update: async () => ({ id: "claim-r", expiresAt: now }),
      },
      venueMembership: { upsert: async () => ({ id: "m-r" }), deleteMany: async () => ({ count: 0 }) },
      $transaction: async (fn) => fn({} as never),
    } as never,
  });

  assert.deepEqual(result, { error: "cooldown" });
});

test("resendClaimToken returns not_found when no pending claim", async () => {
  const { resendClaimToken } = await import("../lib/venue-claims/service");
  const result = await resendClaimToken({
    slug: "venue-resend",
    userId: "user-r",
    db: {
      venue: {
        findUnique: async () => ({ id: "venue-r", slug: "venue-resend", name: "Venue Resend", contactEmail: "owner@example.com", claimStatus: "PENDING" as const }),
        update: async () => ({ id: "venue-r" }),
      },
      venueClaimRequest: {
        findFirst: async () => null,
        create: async () => ({ id: "claim-r", venueId: "venue-r", status: "PENDING_VERIFICATION" as const, expiresAt: null }),
        update: async () => ({ id: "claim-r", expiresAt: new Date() }),
      },
      venueMembership: { upsert: async () => ({ id: "m-r" }), deleteMany: async () => ({ count: 0 }) },
      $transaction: async (fn) => fn({} as never),
    } as never,
  });

  assert.deepEqual(result, { error: "not_found" });
});


test("revokeClaim removes membership and resets venue claim status", async () => {
  let removedMembership = false;
  let venueReset = false;
  let claimRejected = false;

  const tx = {
    venueClaimRequest: {
      findUnique: async () => ({ id: "claim-rv", venueId: "venue-rv", userId: "user-rv", status: "VERIFIED", expiresAt: null }),
      findFirst: async () => null,
      create: async () => ({ id: "claim-rv", venueId: "venue-rv", status: "VERIFIED", expiresAt: null }),
      update: async ({ data }: { data: { status: string; rejectionReason: string } }) => {
        if (data.status === "REJECTED" && data.rejectionReason === "Revoked by admin") claimRejected = true;
        return { id: "claim-rv" };
      },
    },
    venueMembership: {
      upsert: async () => ({ id: "membership-rv" }),
      deleteMany: async () => {
        removedMembership = true;
        return { count: 1 };
      },
    },
    venue: {
      findUnique: async () => null,
      update: async ({ data }: { data: { claimStatus: string } }) => {
        if (data.claimStatus === "UNCLAIMED") venueReset = true;
        return { id: "venue-rv" };
      },
    },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await revokeClaim(tx as never, "claim-rv", new Date());
  assert.equal(result?.id, "claim-rv");
  assert.equal(removedMembership, true);
  assert.equal(venueReset, true);
  assert.equal(claimRejected, true);
});

test("revokeClaim on non-existent claim returns null", async () => {
  const tx = {
    venueClaimRequest: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => ({ id: "claim-none", venueId: "venue-none", status: "VERIFIED", expiresAt: null }),
      update: async () => ({ id: "claim-none" }),
    },
    venueMembership: {
      upsert: async () => ({ id: "membership-none" }),
      deleteMany: async () => ({ count: 0 }),
    },
    venue: { findUnique: async () => null, update: async () => ({ id: "venue-none" }) },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await revokeClaim(tx as never, "missing-claim", new Date());
  assert.equal(result, null);
});


test("rejectClaim sets status to REJECTED and resets venue claimStatus to UNCLAIMED", async () => {
  let venueReset = false;
  let claimRejected = false;

  const tx = {
    venueClaimRequest: {
      findUnique: async () => ({ id: "claim-rj", venueId: "venue-rj", userId: "user-rj", status: "PENDING_VERIFICATION", expiresAt: null }),
      findFirst: async () => null,
      create: async () => ({ id: "claim-rj", venueId: "venue-rj", status: "PENDING_VERIFICATION", expiresAt: null }),
      update: async ({ data }: { data: { status: string } }) => {
        if (data.status === "REJECTED") claimRejected = true;
        return { id: "claim-rj" };
      },
    },
    venueMembership: {
      upsert: async () => ({ id: "membership-rj" }),
      deleteMany: async () => ({ count: 0 }),
    },
    venue: {
      findUnique: async () => null,
      update: async ({ data }: { data: { claimStatus: string } }) => {
        if (data.claimStatus === "UNCLAIMED") venueReset = true;
        return { id: "venue-rj" };
      },
    },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await rejectClaim(tx as never, "claim-rj", null, new Date());
  assert.equal(result?.id, "claim-rj");
  assert.equal(claimRejected, true);
  assert.equal(venueReset, true);
});

test("rejectClaim persists the rejectionReason string", async () => {
  let savedReason: string | null = null;

  const tx = {
    venueClaimRequest: {
      findUnique: async () => ({ id: "claim-rj2", venueId: "venue-rj2", userId: "user-rj2", status: "PENDING_VERIFICATION", expiresAt: null }),
      findFirst: async () => null,
      create: async () => ({ id: "claim-rj2", venueId: "venue-rj2", status: "PENDING_VERIFICATION", expiresAt: null }),
      update: async ({ data }: { data: { rejectionReason: string | null } }) => {
        savedReason = data.rejectionReason;
        return { id: "claim-rj2" };
      },
    },
    venueMembership: {
      upsert: async () => ({ id: "membership-rj2" }),
      deleteMany: async () => ({ count: 0 }),
    },
    venue: { findUnique: async () => null, update: async () => ({ id: "venue-rj2" }) },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  await rejectClaim(tx as never, "claim-rj2", "Insufficient evidence", new Date());
  assert.equal(savedReason, "Insufficient evidence");
});

test("rejectClaim on a non-existent claim returns null", async () => {
  const tx = {
    venueClaimRequest: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => ({ id: "claim-none", venueId: "venue-none", status: "PENDING_VERIFICATION", expiresAt: null }),
      update: async () => ({ id: "claim-none" }),
    },
    venueMembership: {
      upsert: async () => ({ id: "membership-none" }),
      deleteMany: async () => ({ count: 0 }),
    },
    venue: { findUnique: async () => null, update: async () => ({ id: "venue-none" }) },
    $transaction: async (fn: (inner: never) => Promise<unknown>) => fn(tx as never),
  };

  const result = await rejectClaim(tx as never, "missing-claim", null, new Date());
  assert.equal(result, null);
});
