import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  handleArtistImageUpload,
  handleCreateArtistImage,
  handleReorderArtistImages,
  handleSetArtistCover,
} from "@/lib/my-artist-images-route";
import { artistUploadRequestSchema } from "@/lib/validators";
import { ForbiddenError } from "@/lib/http-errors";

const imageId = "11111111-1111-4111-8111-111111111111";

test("artist image create returns unauthorized", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/a.jpg" }),
  });

  const res = await handleCreateArtistImage(req, {
    requireAuth: async () => { throw new Error("unauthorized"); },
    getOwnedArtistId: async () => "artist-1",
    findMaxSortOrder: async () => 0,
    createArtistImage: async () => ({ id: imageId, artistId: "artist-1", url: "https://example.com/a.jpg", alt: null, sortOrder: 1, assetId: null }),
  });

  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "unauthorized");
});

test("artist image create returns forbidden when no artist", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/a.jpg" }),
  });

  const res = await handleCreateArtistImage(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => null,
    findMaxSortOrder: async () => 0,
    createArtistImage: async () => ({ id: imageId, artistId: "artist-1", url: "https://example.com/a.jpg", alt: null, sortOrder: 1, assetId: null }),
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, "forbidden");
});

test("artist image reorder rejects ownership mismatch", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/images/reorder", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderedIds: [imageId, "22222222-2222-4222-8222-222222222222"] }),
  });

  const res = await handleReorderArtistImages(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => "artist-1",
    findArtistImageIds: async () => [imageId],
    reorderArtistImages: async () => undefined,
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "invalid_request");
});

test("artist cover uses featuredAssetId precedence when asset-backed", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/cover", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId }),
  });

  const res = await handleSetArtistCover(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => "artist-1",
    findArtistImageById: async () => ({ id: imageId, url: "https://example.com/a.jpg", assetId: "33333333-3333-4333-8333-333333333333" }),
    updateArtistCover: async (_artistId, payload) => {
      assert.deepEqual(payload, { featuredAssetId: "33333333-3333-4333-8333-333333333333", featuredImageUrl: null });
      return payload;
    },
  });

  assert.equal(res.status, 200);
});

test("artist cover uses featuredImageUrl when url-backed", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/cover", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId }),
  });

  const res = await handleSetArtistCover(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => "artist-1",
    findArtistImageById: async () => ({ id: imageId, url: "https://example.com/no-asset.jpg", assetId: null }),
    updateArtistCover: async (_artistId, payload) => {
      assert.deepEqual(payload, { featuredAssetId: null, featuredImageUrl: "https://example.com/no-asset.jpg" });
      return payload;
    },
  });

  assert.equal(res.status, 200);
});

test("artist upload rejects malformed handshake payload", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/images/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: { clientPayload: "{}" } }),
  });

  const res = await handleArtistImageUpload(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => "artist-1",
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "invalid_request");
});


test("artist upload payload validator rejects bad MIME and size", () => {
  const parsed = artistUploadRequestSchema.safeParse({ fileName: "file.gif", contentType: "image/gif", size: 6 * 1024 * 1024 });
  assert.equal(parsed.success, false);
});

test("artist cover clears when imageId is null", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/cover", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: null }),
  });

  const res = await handleSetArtistCover(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => "artist-1",
    findArtistImageById: async () => {
      throw new Error("should_not_lookup_image");
    },
    updateArtistCover: async (_artistId, payload) => {
      assert.deepEqual(payload, { featuredAssetId: null, featuredImageUrl: null });
      return payload;
    },
  });

  assert.equal(res.status, 200);
});


test("artist image create maps typed forbidden errors to 403", async () => {
  const req = new NextRequest("http://localhost/api/my/artist/images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/a.jpg" }),
  });

  const res = await handleCreateArtistImage(req, {
    requireAuth: async () => ({ id: "user-1" }),
    getOwnedArtistId: async () => { throw new ForbiddenError(); },
    findMaxSortOrder: async () => 0,
    createArtistImage: async () => ({ id: imageId, artistId: "artist-1", url: "https://example.com/a.jpg", alt: null, sortOrder: 1, assetId: null }),
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, "forbidden");
});
