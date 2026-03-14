import test from "node:test";
import assert from "node:assert/strict";
import { importApprovedArtistImage } from "../lib/ingest/import-approved-artist-image";

const previousImageEnabled = process.env.AI_INGEST_IMAGE_ENABLED;

test.after(() => {
  process.env.AI_INGEST_IMAGE_ENABLED = previousImageEnabled;
});

test("returns disabled warning when AI_INGEST_IMAGE_ENABLED is not set", async () => {
  process.env.AI_INGEST_IMAGE_ENABLED = "0";

  const result = await importApprovedArtistImage({
    appDb: {
      artist: {
        findUnique: async () => ({ featuredAssetId: null }),
        update: async () => ({}),
      },
      artistImage: {
        create: async () => ({ id: "artist-image-1" }),
      },
      asset: {
        create: async () => ({ id: "asset-1", url: "https://blob.example/artist.jpg" }),
      },
    },
    artistId: "artist-1",
    name: "Artist Name",
    websiteUrl: "https://artist.example",
    sourceUrl: "https://en.wikipedia.org/wiki/Artist",
    requestId: "request-1",
  });

  assert.deepEqual(result, {
    attached: false,
    warning: "image-import disabled: set AI_INGEST_IMAGE_ENABLED=1 to enable",
    imageUrl: null,
  });
});

test("returns early when artist already has featured image", async () => {
  process.env.AI_INGEST_IMAGE_ENABLED = "1";

  let updated = false;
  const result = await importApprovedArtistImage({
    appDb: {
      artist: {
        findUnique: async () => ({ featuredAssetId: "asset-existing" }),
        update: async () => {
          updated = true;
          return {};
        },
      },
      artistImage: {
        create: async () => ({ id: "artist-image-1" }),
      },
      asset: {
        create: async () => ({ id: "asset-1", url: "https://blob.example/artist.jpg" }),
      },
    },
    artistId: "artist-1",
    name: "Artist Name",
    websiteUrl: "https://artist.example",
    sourceUrl: "https://en.wikipedia.org/wiki/Artist",
    requestId: "request-1",
  });

  assert.equal(updated, false);
  assert.deepEqual(result, { attached: false, warning: null, imageUrl: null });
});
