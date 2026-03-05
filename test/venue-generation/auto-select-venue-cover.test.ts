import test from "node:test";
import assert from "node:assert/strict";
import { autoSelectVenueCover } from "../../lib/venue-generation/auto-select-venue-cover";

function createDb() {
  return {
    asset: {
      create: async () => ({ id: "asset-1" }),
    },
    venueImage: {
      create: async () => ({ id: "venue-image-1" }),
    },
    venue: {
      update: async () => ({ id: "venue-1" }),
    },
    venueHomepageImageCandidate: {
      update: async () => ({ id: "candidate-1" }),
    },
  };
}

test("autoSelectVenueCover happy path", async () => {
  const result = await autoSelectVenueCover({
    venueId: "venue-1",
    candidateId: "candidate-1",
    candidateUrl: "https://example.com/hero.jpg",
    db: createDb(),
    deps: {
      assertUrl: async () => undefined,
      fetchImage: async () => ({ contentType: "image/jpeg", bytes: new Uint8Array([1, 2, 3]), sizeBytes: 3 }),
      uploadImage: async () => ({ url: "https://blob.example/hero.jpg", path: "x" }),
    },
  });

  assert.deepEqual(result, { ok: true, venueImageId: "venue-image-1", blobUrl: "https://blob.example/hero.jpg" });
});

test("autoSelectVenueCover blocks unsafe URLs", async () => {
  const result = await autoSelectVenueCover({
    venueId: "venue-1",
    candidateId: "candidate-1",
    candidateUrl: "http://127.0.0.1/private",
    db: createDb(),
    deps: {
      assertUrl: async () => {
        throw new Error("unsafe");
      },
    },
  });

  assert.deepEqual(result, { ok: false, reason: "unsafe_url" });
});

test("autoSelectVenueCover returns fetch_failed", async () => {
  const result = await autoSelectVenueCover({
    venueId: "venue-1",
    candidateId: "candidate-1",
    candidateUrl: "https://example.com/hero.jpg",
    db: createDb(),
    deps: {
      assertUrl: async () => undefined,
      fetchImage: async () => {
        throw new Error("fetch");
      },
    },
  });

  assert.deepEqual(result, { ok: false, reason: "fetch_failed" });
});

test("autoSelectVenueCover returns upload_failed", async () => {
  const result = await autoSelectVenueCover({
    venueId: "venue-1",
    candidateId: "candidate-1",
    candidateUrl: "https://example.com/hero.jpg",
    db: createDb(),
    deps: {
      assertUrl: async () => undefined,
      fetchImage: async () => ({ contentType: "image/jpeg", bytes: new Uint8Array([1]), sizeBytes: 1 }),
      uploadImage: async () => {
        throw new Error("upload");
      },
    },
  });

  assert.deepEqual(result, { ok: false, reason: "upload_failed" });
});
