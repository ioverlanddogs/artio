import test from "node:test";
import assert from "node:assert/strict";
import { extractEventsWithOpenAI } from "@/lib/ingest/openai-extract";
import { IngestError } from "@/lib/ingest/errors";

const previousApiKey = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;

test.afterEach(() => {
  global.fetch = originalFetch;
  process.env.OPENAI_API_KEY = previousApiKey;
});

test("extractEventsWithOpenAI reads structured JSON output without parsing output_text", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  global.fetch = (async () => new Response(JSON.stringify({
    output_parsed: {
      events: [
        {
          title: "Opening Night",
          startAt: "2026-06-10T19:00:00.000Z",
          endAt: null,
          timezone: "America/Chicago",
          locationText: "Main Hall",
          description: null,
          sourceUrl: "https://example.com/events/opening-night",
        },
      ],
    },
    usage: {
      input_tokens: 123,
      output_tokens: 45,
      total_tokens: 168,
    },
  }), { status: 200 })) as typeof fetch;

  const result = await extractEventsWithOpenAI({
    html: "<html><body><h1>Opening Night</h1></body></html>",
    sourceUrl: "https://example.com",
    model: "gpt-4o-mini",
  });

  assert.equal(result.model, "gpt-4o-mini");
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.title, "Opening Night");
  assert.deepEqual(result.raw, {
    events: [
      {
        title: "Opening Night",
        startAt: "2026-06-10T19:00:00.000Z",
        endAt: null,
        timezone: "America/Chicago",
        locationText: "Main Hall",
        description: null,
        sourceUrl: "https://example.com/events/opening-night",
      },
    ],
  });
  assert.deepEqual(result.usage, {
    promptTokens: 123,
    completionTokens: 45,
    totalTokens: 168,
  });
});

test("extractEventsWithOpenAI throws BAD_MODEL_OUTPUT for invalid structured JSON shape", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  global.fetch = (async () => new Response(JSON.stringify({
    output: [
      {
        content: [{ type: "output_json", json: { events: [{ title: "" }] } }],
      },
    ],
  }), { status: 200 })) as typeof fetch;

  await assert.rejects(
    () =>
      extractEventsWithOpenAI({
        html: "<html><body>Bad output</body></html>",
        sourceUrl: "https://example.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof IngestError);
      return error.code === "BAD_MODEL_OUTPUT";
    },
  );
});
