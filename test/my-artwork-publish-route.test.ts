import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handlePatchArtworkPublish } from "@/lib/my-artwork-publish-route";

const req = new NextRequest("http://localhost/api/my/artwork/id/publish", { method: "PATCH" });

test("publishing without title returns 400 NOT_READY", async () => {
  const response = await handlePatchArtworkPublish(req, { artworkId: "a1", isPublished: true }, {
    requireMyArtworkAccess: async () => ({ user: { id: "u1", email: "artist@example.com" } }),
    findArtworkById: async () => ({ id: "a1", title: "", description: null, year: null, medium: null, featuredAssetId: null, isPublished: false }),
    listArtworkImages: async () => [],
    updateArtworkPublishState: async () => { throw new Error("should not publish"); },
    createArtworkSubmission: async () => { throw new Error("should not submit"); },
    logAdminAction: async () => undefined,
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "NOT_READY");
  assert.equal(body.blocking.some((issue: { id: string }) => issue.id === "artwork-title"), true);
});

test("publishing without images returns 400 NOT_READY and no state change", async () => {
  let updated = false;
  const response = await handlePatchArtworkPublish(req, { artworkId: "a1", isPublished: true }, {
    requireMyArtworkAccess: async () => ({ user: { id: "u1", email: "artist@example.com" } }),
    findArtworkById: async () => ({ id: "a1", title: "Valid title", description: null, year: null, medium: null, featuredAssetId: null, isPublished: false }),
    listArtworkImages: async () => [],
    updateArtworkPublishState: async () => { updated = true; throw new Error("should not publish"); },
    createArtworkSubmission: async () => { throw new Error("should not submit"); },
    logAdminAction: async () => undefined,
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.blocking.some((issue: { id: string }) => issue.id === "artwork-images"), true);
  assert.equal(updated, false);
});

test("unpublishing still updates isPublished=false directly", async () => {
  let logged = false;
  let payload: { isPublished: boolean; status?: string; featuredAssetId?: string } | null = null;
  const response = await handlePatchArtworkPublish(req, { artworkId: "a1", isPublished: false }, {
    requireMyArtworkAccess: async () => ({ user: { id: "u1", email: "artist@example.com" } }),
    findArtworkById: async () => null,
    listArtworkImages: async () => [],
    updateArtworkPublishState: async (_id, input) => {
      payload = input;
      return { id: "a1", title: "x", description: null, year: null, medium: null, featuredAssetId: null, isPublished: false };
    },
    createArtworkSubmission: async () => { throw new Error("should not submit"); },
    logAdminAction: async () => { logged = true; },
  });

  assert.equal(response.status, 200);
  assert.equal(logged, true);
  assert.deepEqual(payload, { isPublished: false, status: "DRAFT" });
});

test("submitting a ready artwork creates submission and returns submitted outcome", async () => {
  let createCalled = false;
  let updatedPayload: { isPublished: boolean; status?: string; featuredAssetId?: string } | null = null;
  const response = await handlePatchArtworkPublish(req, { artworkId: "a1", isPublished: true }, {
    requireMyArtworkAccess: async () => ({ user: { id: "u1", email: "artist@example.com" } }),
    findArtworkById: async () => ({ id: "a1", title: "Valid title", description: "This description is long enough for recommendation.", year: 2024, medium: "Ink", featuredAssetId: null, isPublished: false }),
    listArtworkImages: async () => [{ id: "img-1", assetId: "asset-1" }],
    updateArtworkPublishState: async (_id, input) => {
      updatedPayload = input;
      return { id: "a1", title: "Valid title", description: null, year: null, medium: null, featuredAssetId: input.featuredAssetId ?? null, isPublished: false };
    },
    createArtworkSubmission: async () => {
      createCalled = true;
      return { id: "sub-1" };
    },
    logAdminAction: async () => undefined,
  });

  assert.equal(response.status, 200);
  assert.equal(createCalled, true);
  assert.deepEqual(updatedPayload, { isPublished: false, status: "IN_REVIEW", featuredAssetId: "asset-1" });
  const body = await response.json();
  assert.equal(body.outcome, "submitted");
  assert.equal(body.submissionId, "sub-1");
});

test("submitting a ready artwork never sets isPublished=true", async () => {
  const calls: Array<{ isPublished: boolean; status?: string; featuredAssetId?: string }> = [];
  const response = await handlePatchArtworkPublish(req, { artworkId: "a1", isPublished: true }, {
    requireMyArtworkAccess: async () => ({ user: { id: "u1", email: "artist@example.com" } }),
    findArtworkById: async () => ({ id: "a1", title: "Valid title", description: "This description is long enough for recommendation.", year: 2024, medium: "Ink", featuredAssetId: "asset-1", isPublished: false }),
    listArtworkImages: async () => [{ id: "img-1", assetId: "asset-1" }],
    updateArtworkPublishState: async (_id, input) => {
      calls.push(input);
      return { id: "a1", title: "Valid title", description: null, year: null, medium: null, featuredAssetId: input.featuredAssetId ?? null, isPublished: false };
    },
    createArtworkSubmission: async () => ({ id: "sub-1" }),
    logAdminAction: async () => undefined,
  });

  assert.equal(response.status, 200);
  assert.equal(calls.some((call) => call.isPublished === true), false);
});
