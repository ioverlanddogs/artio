import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAdminIngestPublishArtwork } from "@/lib/admin-ingest-publish-artwork-route";

test("artwork found, ready, and published successfully", async () => {
  const state = {
    artwork: {
      id: "artwork-1",
      title: "Blue Sky",
      status: "IN_REVIEW",
      isAiDiscovered: true,
      deletedAt: null,
      featuredAssetId: null,
      medium: "Ink",
      year: 2025,
      isPublished: false,
      ingestCandidate: { id: "candidate-1" },
    },
    auditLogs: 0,
  };

  const tx = {
    artwork: {
      update: async ({ data }: { data: { status: "PUBLISHED"; isPublished: boolean } }) => {
        state.artwork.status = data.status;
        state.artwork.isPublished = data.isPublished;
        return state.artwork;
      },
    },
    adminAuditLog: {
      create: async () => {
        state.auditLogs += 1;
        return { id: "audit-1" };
      },
    },
  };

  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artworks/artwork-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtwork(req, { id: "artwork-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artwork: { findUnique: async () => state.artwork },
      artworkImage: { findMany: async () => [{ id: "img-1", assetId: "asset-1" }] },
      $transaction: async <T>(cb: (trx: typeof tx) => Promise<T>) => cb(tx),
    } as never,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { artworkId: "artwork-1", published: true });
  assert.equal(state.artwork.status, "PUBLISHED");
  assert.equal(state.artwork.isPublished, true);
  assert.equal(state.auditLogs, 1);
});

test("artwork not ready returns 400 not_ready with blocking array", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artworks/artwork-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtwork(req, { id: "artwork-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artwork: {
        findUnique: async () => ({
          id: "artwork-1",
          title: "Blue Sky",
          status: "IN_REVIEW",
          isAiDiscovered: true,
          deletedAt: null,
          featuredAssetId: null,
          medium: null,
          year: null,
          ingestCandidate: { id: "candidate-1" },
        }),
      },
      artworkImage: { findMany: async () => [] },
    } as never,
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "not_ready");
  assert.equal(Array.isArray(body.error.details.blocking), true);
});

test("artwork not found returns 404", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artworks/missing", { method: "POST" });
  const res = await handleAdminIngestPublishArtwork(req, { id: "missing" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: { artwork: { findUnique: async () => null } } as never,
  });

  assert.equal(res.status, 404);
});

test("artwork already published returns 409 invalid_state", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artworks/artwork-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtwork(req, { id: "artwork-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artwork: {
        findUnique: async () => ({
          id: "artwork-1",
          title: "Blue Sky",
          status: "PUBLISHED",
          isAiDiscovered: true,
          deletedAt: null,
          featuredAssetId: null,
          medium: null,
          year: null,
          ingestCandidate: { id: "candidate-1" },
        }),
      },
    } as never,
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error.code, "invalid_state");
});

test("unauthenticated returns 401", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artworks/artwork-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtwork(req, { id: "artwork-1" }, {
    requireAdmin: async () => { throw new Error("unauthorized"); },
    db: {} as never,
  });

  assert.equal(res.status, 401);
});
