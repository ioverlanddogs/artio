import test from "node:test";
import assert from "node:assert/strict";
import { fetchImageWithGuards } from "../../lib/ingest/fetch-image";
import { IngestError } from "../../lib/ingest/errors";

const assertSafeUrlImpl = async (url: string) => new URL(url);

test("fetchImageWithGuards rejects non-image content type", async () => {
  await assert.rejects(
    () => fetchImageWithGuards("https://example.com/a", {
      fetchImpl: async () => new Response("not image", { headers: { "content-type": "text/html" }, status: 200 }),
      assertSafeUrlImpl,
    }),
    (error: unknown) => error instanceof IngestError && error.code === "UNSUPPORTED_CONTENT_TYPE",
  );
});

test("fetchImageWithGuards rejects oversized responses", async () => {
  const bytes = new Uint8Array(10);
  await assert.rejects(
    () => fetchImageWithGuards("https://example.com/a", {
      maxBytes: 5,
      fetchImpl: async () => new Response(bytes, { headers: { "content-type": "image/png" }, status: 200 }),
      assertSafeUrlImpl,
    }),
    (error: unknown) => error instanceof IngestError && error.code === "FETCH_TOO_LARGE",
  );
});

test("fetchImageWithGuards accepts jpeg/png", async () => {
  const jpeg = await fetchImageWithGuards("https://example.com/a.jpg", {
    fetchImpl: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" }, status: 200 }),
    assertSafeUrlImpl,
  });
  assert.equal(jpeg.contentType, "image/jpeg");
  assert.equal(jpeg.sizeBytes, 3);

  const png = await fetchImageWithGuards("https://example.com/a.png", {
    fetchImpl: async () => new Response(new Uint8Array([4, 5]), { headers: { "content-type": "image/png" }, status: 200 }),
    assertSafeUrlImpl,
  });
  assert.equal(png.contentType, "image/png");
  assert.equal(png.sizeBytes, 2);
});


test("fetchImageWithGuards rejects PNG below minWidth", async () => {
  // Minimal valid PNG: 1×1 pixel
  const png1x1 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length = 13
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc
    0x90, 0x77, 0x53, 0xde, // CRC (arbitrary)
  ]);

  await assert.rejects(
    () => fetchImageWithGuards("https://example.com/tiny.png", {
      minWidth: 200,
      fetchImpl: async () => new Response(png1x1, {
        headers: { "content-type": "image/png" },
        status: 200,
      }),
      assertSafeUrlImpl,
    }),
    (error: unknown) =>
      error instanceof IngestError && error.code === "IMAGE_TOO_SMALL",
  );
});

test("fetchImageWithGuards accepts PNG above minWidth", async () => {
  // PNG header with width=800, height=600
  const png800x600 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x03, 0x20, // width = 800 (0x0320)
    0x00, 0x00, 0x02, 0x58, // height = 600 (0x0258)
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  const result = await fetchImageWithGuards("https://example.com/big.png", {
    minWidth: 200,
    minHeight: 200,
    fetchImpl: async () => new Response(png800x600, {
      headers: { "content-type": "image/png" },
      status: 200,
    }),
    assertSafeUrlImpl,
  });

  assert.equal(result.contentType, "image/png");
});

test("fetchImageWithGuards allows image through when dimensions unreadable", async () => {
  // A GIF-like byte sequence (not parseable for dimensions in our impl)
  const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);

  const result = await fetchImageWithGuards("https://example.com/image.gif", {
    minWidth: 200,
    fetchImpl: async () => new Response(gifBytes, {
      headers: { "content-type": "image/gif" },
      status: 200,
    }),
    assertSafeUrlImpl,
  });

  assert.equal(result.contentType, "image/gif");
});
