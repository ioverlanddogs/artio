import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminArtworkImageReplace } from "../../lib/admin-artwork-image-replace-route";

const artworkId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/admin/artworks/${artworkId}/image`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("replaces artwork image and returns 200 on happy path", async () => {
  const calls = {
    artworkImageCreate: [] as Array<Record<string, unknown>>,
    artworkUpdate: [] as Array<Record<string, unknown>>,
    logged: 0,
  };

  const tx = {
    asset: { create: async () => ({ id: "asset-2" }) },
    artworkImage: {
      findMany: async () => [{ id: "old-1", sortOrder: 0 }],
      updateMany: async () => ({ count: 1 }),
      create: async (args: { data: Record<string, unknown> }) => {
        calls.artworkImageCreate.push(args.data);
        return { id: "artwork-image-2" };
      },
    },
    artwork: {
      update: async (args: { data: Record<string, unknown> }) => {
        calls.artworkUpdate.push(args.data);
        return { id: artworkId };
      },
    },
  };

  const response = await handleAdminArtworkImageReplace(
    makeRequest({ sourceUrl: "https://example.com/artwork.jpg" }),
    { id: artworkId },
    "admin@example.com",
    {
      appDb: {
        artwork: {
          findUnique: async () => ({ id: artworkId, title: "Test Artwork" }),
        },
        artworkImage: tx.artworkImage,
        asset: tx.asset,
        $transaction: async (fn: (input: typeof tx) => Promise<{ id: string }>) => fn(tx),
      } as never,
      assertUrlFn: async () => new URL("https://example.com/artwork.jpg"),
      fetchImageFn: async () => ({ bytes: new Uint8Array([1, 2, 3]), sizeBytes: 3, contentType: "image/jpeg" }),
      uploadImageFn: async () => ({ url: "https://blob.example/new-artwork.jpg", path: "p" }),
      logAction: async () => {
        calls.logged += 1;
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { imageId: "artwork-image-2", url: "https://blob.example/new-artwork.jpg" });
  assert.equal(calls.artworkImageCreate[0]?.sortOrder, 0);
  assert.equal(calls.artworkUpdate[0]?.featuredAssetId, "asset-2");
  assert.equal(calls.logged, 1);
});

test("returns 422 when assertUrlFn rejects source URL", async () => {
  const response = await handleAdminArtworkImageReplace(
    makeRequest({ sourceUrl: "http://169.254.169.254/latest" }),
    { id: artworkId },
    "admin@example.com",
    {
      appDb: { artwork: { findUnique: async () => ({ id: artworkId, title: "Artwork" }) }, artworkImage: {} as never, asset: {} as never } as never,
      assertUrlFn: async () => {
        throw new Error("blocked");
      },
    } as never,
  );

  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error?.code, "invalid_source_url");
});

test("returns 422 when fetchImageFn fails", async () => {
  const response = await handleAdminArtworkImageReplace(
    makeRequest({ sourceUrl: "https://example.com/image.jpg" }),
    { id: artworkId },
    "admin@example.com",
    {
      appDb: { artwork: { findUnique: async () => ({ id: artworkId, title: "Artwork" }) }, artworkImage: {} as never, asset: {} as never } as never,
      assertUrlFn: async () => new URL("https://example.com/image.jpg"),
      fetchImageFn: async () => {
        throw new Error("fetch failed");
      },
    } as never,
  );

  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error?.code, "fetch_failed");
});

test("returns 500 when uploadImageFn fails", async () => {
  const response = await handleAdminArtworkImageReplace(
    makeRequest({ sourceUrl: "https://example.com/image.jpg" }),
    { id: artworkId },
    "admin@example.com",
    {
      appDb: { artwork: { findUnique: async () => ({ id: artworkId, title: "Artwork" }) }, artworkImage: {} as never, asset: {} as never } as never,
      assertUrlFn: async () => new URL("https://example.com/image.jpg"),
      fetchImageFn: async () => ({ bytes: new Uint8Array([1]), sizeBytes: 1, contentType: "image/jpeg" }),
      uploadImageFn: async () => {
        throw new Error("upload failed");
      },
    } as never,
  );

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error?.code, "upload_failed");
});

test("returns 404 when artwork is not found", async () => {
  const response = await handleAdminArtworkImageReplace(
    makeRequest({ sourceUrl: "https://example.com/image.jpg" }),
    { id: artworkId },
    "admin@example.com",
    {
      appDb: { artwork: { findUnique: async () => null }, artworkImage: {} as never, asset: {} as never } as never,
      assertUrlFn: async () => new URL("https://example.com/image.jpg"),
    } as never,
  );

  assert.equal(response.status, 404);
});
