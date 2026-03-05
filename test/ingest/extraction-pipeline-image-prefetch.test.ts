import test from "node:test";
import assert from "node:assert/strict";
import { IngestError } from "@/lib/ingest/errors";
import { runVenueIngestExtraction } from "@/lib/ingest/extraction-pipeline";

function createStore() {
  const runs: Array<Record<string, unknown>> = [];
  const extracted: Array<Record<string, unknown>> = [];

  return {
    runs,
    extracted,
    ingestRun: {
      create: async ({ data }: { data: { venueId: string; sourceUrl: string; status: string; startedAt: Date } }) => {
        const run = { id: `run-${runs.length + 1}`, ...data };
        runs.push(run);
        return run;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const run = runs.find((item) => item.id === where.id);
        if (!run) throw new Error("run not found");
        Object.assign(run, data);
        return run;
      },
    },
    venue: {
      findUnique: async () => ({ country: null, name: "Venue", addressLine1: null, city: null, eventsPageUrl: null, lat: null, lng: null }),
    },
    siteSettings: {
      findUnique: async () => null,
    },
    ingestExtractedEvent: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ext-${extracted.length + 1}`, createdAt: new Date(), blobImageUrl: null, ...data };
        extracted.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = extracted.find((item) => item.id === where.id);
        if (!row) throw new Error("candidate not found");
        Object.assign(row, data);
        return row;
      },
    },
  };
}

const previousEnabled = process.env.AI_INGEST_ENABLED;
const previousApiKey = process.env.OPENAI_API_KEY;
const previousPrefetch = process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED;

test.after(() => {
  process.env.AI_INGEST_ENABLED = previousEnabled;
  process.env.OPENAI_API_KEY = previousApiKey;
  process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED = previousPrefetch;
});

async function runWithTwoPrimaryCandidates(store: ReturnType<typeof createStore>, overrides: {
  assertSafeUrl?: (input: string) => Promise<URL>;
  fetchImageWithGuards?: (url: string) => Promise<{ bytes: Uint8Array; contentType: string; finalUrl: string; sizeBytes: number }>;
  uploadCandidateImageToBlob?: (params: { venueId: string; candidateId: string; sourceUrl: string; contentType: string; bytes: Uint8Array }) => Promise<{ url: string; path: string }>;
} = {}) {
  return runVenueIngestExtraction(
    { venueId: "venue-1", sourceUrl: "https://example.com/events" },
    {
      store,
      fetchHtml: async () => ({ finalUrl: "https://example.com/events", status: 200, contentType: "text/html", bytes: 100, html: "<html></html>" }),
      extractWithOpenAI: async () => ({
        model: "test-model",
        events: [
          { title: "A", startAt: "2026-07-01T10:00:00.000Z", locationText: "Main", imageUrl: "https://cdn.example.com/a.jpg" },
          { title: "B", startAt: "2026-07-02T10:00:00.000Z", locationText: "Main", imageUrl: "https://cdn.example.com/b.jpg" },
        ],
        venueSnapshot: {},
        raw: [],
      }),
      assertSafeUrl: overrides.assertSafeUrl ?? (async (input: string) => new URL(input)),
      fetchImageWithGuards: overrides.fetchImageWithGuards ?? (async (url: string) => ({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        finalUrl: url,
        sizeBytes: 3,
      })),
      uploadCandidateImageToBlob: overrides.uploadCandidateImageToBlob ?? (async ({ candidateId }) => ({
        url: `https://blob.example.com/${candidateId}.jpg`,
        path: `events/ingest/venue-1/${candidateId}/x.jpg`,
      })),
    },
  );
}

test("prefetch enabled updates blobImageUrl for primary candidates with imageUrl", async () => {
  process.env.AI_INGEST_ENABLED = "1";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED = "1";

  const store = createStore();
  const result = await runWithTwoPrimaryCandidates(store);

  assert.equal(result.createdCount, 2);
  assert.equal(store.extracted[0]?.blobImageUrl, "https://blob.example.com/ext-1.jpg");
  assert.equal(store.extracted[1]?.blobImageUrl, "https://blob.example.com/ext-2.jpg");
});

test("prefetch disabled does not update blobImageUrl", async () => {
  process.env.AI_INGEST_ENABLED = "1";
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED;

  const store = createStore();
  await runWithTwoPrimaryCandidates(store);

  assert.equal(store.extracted[0]?.blobImageUrl, null);
  assert.equal(store.extracted[1]?.blobImageUrl, null);
});

test("fetch failure for one candidate is swallowed and other candidates still succeed", async () => {
  process.env.AI_INGEST_ENABLED = "1";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED = "1";

  const store = createStore();
  const result = await runWithTwoPrimaryCandidates(store, {
    fetchImageWithGuards: async (url: string) => {
      if (url.includes("a.jpg")) {
        throw new IngestError("FETCH_FAILED", "boom");
      }
      return { bytes: new Uint8Array([1]), contentType: "image/jpeg", finalUrl: url, sizeBytes: 1 };
    },
  });

  assert.equal(result.createdCount, 2);
  assert.equal(store.runs[0]?.status, "SUCCEEDED");
  assert.equal(store.extracted[0]?.blobImageUrl, null);
  assert.equal(store.extracted[1]?.blobImageUrl, "https://blob.example.com/ext-2.jpg");
});

test("unsafe URL rejection is swallowed and run still succeeds", async () => {
  process.env.AI_INGEST_ENABLED = "1";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.AI_INGEST_IMAGE_PREFETCH_ENABLED = "1";

  const store = createStore();
  const result = await runWithTwoPrimaryCandidates(store, {
    assertSafeUrl: async (input: string) => {
      if (input.includes("a.jpg")) {
        throw new IngestError("DNS_PRIVATE_IP", "blocked");
      }
      return new URL(input);
    },
  });

  assert.equal(result.createdCount, 2);
  assert.equal(store.runs[0]?.status, "SUCCEEDED");
  assert.equal(store.extracted[0]?.blobImageUrl, null);
  assert.equal(store.extracted[1]?.blobImageUrl, "https://blob.example.com/ext-2.jpg");
});
