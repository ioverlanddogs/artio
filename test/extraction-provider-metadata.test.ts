import test from "node:test";
import assert from "node:assert/strict";
import { runVenueIngestExtraction } from "@/lib/ingest/extraction-pipeline";

type RunRecord = {
  id: string;
  status: string;
  venueId: string;
  sourceUrl: string;
  startedAt: Date | null;
  finishedAt?: Date | null;
  extractionMethod?: string | null;
};

function createStore(options?: { eventExtractionProvider?: "openai" | "gemini" | "claude" | null }) {
  const runs: RunRecord[] = [];
  const extracted: Array<Record<string, unknown>> = [];

  return {
    runs,
    extracted,
    ingestRun: {
      create: async ({ data }: { data: { venueId: string; sourceUrl: string; status: string; startedAt: Date } }) => {
        const run = {
          id: `run-${runs.length + 1}`,
          status: data.status,
          venueId: data.venueId,
          sourceUrl: data.sourceUrl,
          startedAt: data.startedAt,
        };
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
      findUnique: async () => ({ country: "United Kingdom", lat: null, lng: null, name: "Venue", addressLine1: null, city: null, eventsPageUrl: null }),
    },
    siteSettings: {
      findUnique: async () => ({
        ingestSystemPrompt: null,
        ingestModel: "test-model",
        ingestMaxOutputTokens: 200,
        openAiApiKey: "openai-key",
        geminiApiKey: "gemini-key",
        anthropicApiKey: "claude-key",
        eventExtractionProvider: options?.eventExtractionProvider ?? "openai",
        ingestEnabled: true,
        ingestMaxCandidatesPerVenueRun: 25,
        ingestDuplicateSimilarityThreshold: 85,
        ingestDuplicateLookbackDays: 30,
        ingestConfidenceHighMin: 75,
        ingestConfidenceMediumMin: 45,
        ingestImageEnabled: false,
      }),
    },
    ingestExtractedEvent: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ext-${extracted.length + 1}`, createdAt: new Date(), ...data };
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

test("stores provider metadata for model extraction candidates", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ events: [{ title: "Gemini Event", startAt: "2027-01-01T10:00:00.000Z", locationText: "Main Hall" }] }) }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const store = createStore({ eventExtractionProvider: "gemini" });

    const result = await runVenueIngestExtraction(
      { venueId: "venue-1", sourceUrl: "https://example.com" },
      {
        store,
        fetchHtml: async () => ({ finalUrl: "https://example.com", status: 200, contentType: "text/html", bytes: 100, html: "<html></html>" }),
        extractJsonLd: () => ({ attempted: false, events: [] }),
      },
    );

    assert.equal(result.createdCount, 1);
    assert.equal(store.extracted[0]?.extractionProvider, "gemini");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("stores json_ld provider marker for json-ld extraction candidates", async () => {
  const store = createStore({ eventExtractionProvider: "openai" });

  const result = await runVenueIngestExtraction(
    { venueId: "venue-1", sourceUrl: "https://example.com" },
    {
      store,
      fetchHtml: async () => ({ finalUrl: "https://example.com", status: 200, contentType: "text/html", bytes: 100, html: "<html></html>" }),
      extractJsonLd: () => ({
        attempted: true,
        events: [{ title: "JSON-LD Event", startAt: new Date("2027-02-01T10:00:00.000Z"), endAt: null, timezone: null, locationText: "Gallery", description: null, sourceUrl: "https://example.com", artistNames: [], imageUrl: null }],
      }),
    },
  );

  assert.equal(result.createdCount, 1);
  assert.equal(store.extracted[0]?.extractionProvider, "json_ld");
});
