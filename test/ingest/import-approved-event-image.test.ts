import test from "node:test";
import assert from "node:assert/strict";
import { importApprovedEventImage } from "../../lib/ingest/import-approved-event-image";

const previousImageEnabled = process.env.AI_INGEST_IMAGE_ENABLED;

test.after(() => {
  process.env.AI_INGEST_IMAGE_ENABLED = previousImageEnabled;
});

test("uses valid candidateImageUrl without fetching source html", async () => {
  process.env.AI_INGEST_IMAGE_ENABLED = "1";

  let htmlFetchCalls = 0;

  const result = await importApprovedEventImage({
    appDb: {
      event: {
        findUnique: async () => ({ featuredAssetId: null, featuredAsset: null }),
      },
      eventImage: {
        create: async () => ({ id: "event-image-1" }),
      },
      asset: {
        create: async () => ({ id: "asset-1", url: "https://blob.example/uploaded.jpg" }),
      },
    },
    candidateId: "candidate-1",
    runId: "run-1",
    eventId: "event-1",
    venueId: "venue-1",
    title: "Title",
    sourceUrl: "https://venue.example/events/123",
    venueWebsiteUrl: "https://venue.example",
    candidateImageUrl: "https://cdn.example.com/event.jpg",
    requestId: "request-1",
  }, {
    fetchHtmlWithGuards: async () => {
      htmlFetchCalls += 1;
      return { html: "" };
    },
    fetchImageWithGuards: async (url) => {
      assert.equal(url, "https://cdn.example.com/event.jpg");
      return { bytes: new Uint8Array([1, 2, 3]), sizeBytes: 3, contentType: "image/jpeg", finalUrl: url };
    },
    uploadEventImageToBlob: async () => ({
      url: "https://blob.example/uploaded.jpg",
      pathname: "venues/venue-1/uploaded.jpg",
      contentType: "image/jpeg",
      sizeBytes: 3,
      sha256: "abc",
    }),
  });

  assert.equal(htmlFetchCalls, 0);
  assert.deepEqual(result, { attached: true, warning: null, imageUrl: "https://blob.example/uploaded.jpg" });
});


test("returns warning when image import feature flag is disabled", async () => {
  process.env.AI_INGEST_IMAGE_ENABLED = "0";

  const result = await importApprovedEventImage({
    appDb: {
      event: {
        findUnique: async () => ({ featuredAssetId: null, featuredAsset: null }),
      },
      eventImage: {
        create: async () => ({ id: "event-image-1" }),
      },
      asset: {
        create: async () => ({ id: "asset-1", url: "https://blob.example/uploaded.jpg" }),
      },
    },
    candidateId: "candidate-1",
    runId: "run-1",
    eventId: "event-1",
    venueId: "venue-1",
    title: "Title",
    sourceUrl: "https://venue.example/events/123",
    venueWebsiteUrl: "https://venue.example",
    candidateImageUrl: "https://cdn.example.com/event.jpg",
    requestId: "request-1",
  });

  assert.deepEqual(result, {
    attached: false,
    warning: "image-import disabled: set AI_INGEST_IMAGE_ENABLED=1 to enable",
    imageUrl: null,
  });
});


test("skips image import when resolved URL is not absolute http(s)", async () => {
  process.env.AI_INGEST_IMAGE_ENABLED = "1";

  let fetchImageCalls = 0;

  const result = await importApprovedEventImage({
    appDb: {
      event: {
        findUnique: async () => ({ featuredAssetId: null, featuredAsset: null }),
      },
      eventImage: {
        create: async () => ({ id: "event-image-1" }),
      },
      asset: {
        create: async () => ({ id: "asset-1", url: "https://blob.example/uploaded.jpg" }),
      },
    },
    candidateId: "candidate-1",
    runId: "run-1",
    eventId: "event-1",
    venueId: "venue-1",
    title: "Title",
    sourceUrl: "https://venue.example/events/123",
    venueWebsiteUrl: "https://venue.example",
    candidateImageUrl: "ftp://cdn.example.com/event.jpg",
    requestId: "request-1",
  }, {
    fetchHtmlWithGuards: async () => ({ html: "" }),
    fetchImageWithGuards: async () => {
      fetchImageCalls += 1;
      return { bytes: new Uint8Array([1, 2, 3]), sizeBytes: 3, contentType: "image/jpeg", finalUrl: "https://cdn.example.com/event.jpg" };
    },
    uploadEventImageToBlob: async () => ({
      url: "https://blob.example/uploaded.jpg",
      pathname: "venues/venue-1/uploaded.jpg",
      contentType: "image/jpeg",
      sizeBytes: 3,
      sha256: "abc",
    }),
  });

  assert.equal(fetchImageCalls, 0);
  assert.deepEqual(result, { attached: false, warning: "image-import skipped: resolved image URL is not absolute", imageUrl: null });
});
