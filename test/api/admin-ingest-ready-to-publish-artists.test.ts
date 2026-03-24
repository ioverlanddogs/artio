import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAdminIngestPublishArtist } from "@/lib/admin-ingest-publish-artist-route";

test("artist found and published successfully", async () => {
  const state = {
    artist: { id: "artist-1", name: "Ada", status: "IN_REVIEW", isAiDiscovered: true, deletedAt: null, isPublished: false },
    auditLogs: 0,
  };

  const tx = {
    artist: {
      update: async ({ data }: { data: { status: "PUBLISHED"; isPublished: boolean } }) => {
        state.artist.status = data.status;
        state.artist.isPublished = data.isPublished;
        return state.artist;
      },
    },
    adminAuditLog: {
      create: async () => {
        state.auditLogs += 1;
        return { id: "audit-1" };
      },
    },
  };

  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artists/artist-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtist(req, { id: "artist-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artist: { findUnique: async () => state.artist },
      $transaction: async <T>(cb: (trx: typeof tx) => Promise<T>) => cb(tx),
    } as never,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { artistId: "artist-1", published: true });
  assert.equal(state.artist.status, "PUBLISHED");
  assert.equal(state.artist.isPublished, true);
  assert.equal(state.auditLogs, 1);
});

test("artist not found returns 404", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artists/missing", { method: "POST" });
  const res = await handleAdminIngestPublishArtist(req, { id: "missing" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: { artist: { findUnique: async () => null } } as never,
  });

  assert.equal(res.status, 404);
});

test("artist already published returns 409 invalid_state", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artists/artist-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtist(req, { id: "artist-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artist: { findUnique: async () => ({ id: "artist-1", name: "Ada", status: "PUBLISHED", isAiDiscovered: true, deletedAt: null }) },
    } as never,
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error.code, "invalid_state");
});

test("artist with isAiDiscovered=false is excluded and returns 404", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artists/artist-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtist(req, { id: "artist-1" }, {
    requireAdmin: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    db: {
      artist: { findUnique: async () => ({ id: "artist-1", name: "Ada", status: "IN_REVIEW", isAiDiscovered: false, deletedAt: null }) },
    } as never,
  });

  assert.equal(res.status, 404);
});

test("unauthenticated returns 401", async () => {
  const req = new NextRequest("http://localhost/api/admin/ingest/ready-to-publish/artists/artist-1", { method: "POST" });
  const res = await handleAdminIngestPublishArtist(req, { id: "artist-1" }, {
    requireAdmin: async () => { throw new Error("unauthorized"); },
    db: {} as never,
  });

  assert.equal(res.status, 401);
});
