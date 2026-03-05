import test from "node:test";
import assert from "node:assert/strict";
import { extractEventsWithOpenAI, isExtractResponse } from "@/lib/ingest/openai-extract";

const originalFetch = global.fetch;
const previousApiKey = process.env.OPENAI_API_KEY;

test.before(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

test.after(() => {
  global.fetch = originalFetch;
  process.env.OPENAI_API_KEY = previousApiKey;
});

test("extractEventsWithOpenAI returns all trimmed venue snapshot fields", async () => {
  global.fetch = (async () => new Response(JSON.stringify({
    output_parsed: {
      events: [{ title: "Event" }],
      venueDescription: "  A contemporary arts venue.  ",
      venueCoverImageUrl: "  /images/venue.jpg  ",
      venueOpeningHours: "  Tue-Sun 10:00-18:00  ",
      venueContactEmail: "  hello@example.com  ",
      venueInstagramUrl: "  https://instagram.com/venue  ",
      venueFacebookUrl: "  https://facebook.com/venue  ",
    },
  }), { status: 200 })) as typeof fetch;

  const result = await extractEventsWithOpenAI({
    html: "<html><body></body></html>",
    sourceUrl: "https://example.com",
  });

  assert.deepEqual(result.venueSnapshot, {
    venueDescription: "A contemporary arts venue.",
    venueCoverImageUrl: "/images/venue.jpg",
    venueOpeningHours: "Tue-Sun 10:00-18:00",
    venueContactEmail: "hello@example.com",
    venueInstagramUrl: "https://instagram.com/venue",
    venueFacebookUrl: "https://facebook.com/venue",
  });
});

test("extractEventsWithOpenAI keeps null venue snapshot fields as null", async () => {
  global.fetch = (async () => new Response(JSON.stringify({
    output_parsed: {
      events: [{ title: "Event" }],
      venueDescription: null,
      venueCoverImageUrl: null,
      venueOpeningHours: null,
      venueContactEmail: null,
      venueInstagramUrl: null,
      venueFacebookUrl: null,
    },
  }), { status: 200 })) as typeof fetch;

  const result = await extractEventsWithOpenAI({
    html: "<html><body></body></html>",
    sourceUrl: "https://example.com",
  });

  assert.deepEqual(result.venueSnapshot, {
    venueDescription: null,
    venueCoverImageUrl: null,
    venueOpeningHours: null,
    venueContactEmail: null,
    venueInstagramUrl: null,
    venueFacebookUrl: null,
  });
});

test("extractEventsWithOpenAI normalizes whitespace-only venue fields to null", async () => {
  global.fetch = (async () => new Response(JSON.stringify({
    output_parsed: {
      events: [{ title: "Event" }],
      venueDescription: "   ",
      venueCoverImageUrl: "\n\t",
      venueOpeningHours: "   ",
      venueContactEmail: "   ",
      venueInstagramUrl: "   ",
      venueFacebookUrl: "   ",
    },
  }), { status: 200 })) as typeof fetch;

  const result = await extractEventsWithOpenAI({
    html: "<html><body></body></html>",
    sourceUrl: "https://example.com",
  });

  assert.deepEqual(result.venueSnapshot, {
    venueDescription: null,
    venueCoverImageUrl: null,
    venueOpeningHours: null,
    venueContactEmail: null,
    venueInstagramUrl: null,
    venueFacebookUrl: null,
  });
});

test("isExtractResponse returns false for invalid top-level venue field types", () => {
  const invalid = {
    events: [{ title: "Event" }],
    venueDescription: 42,
    venueCoverImageUrl: null,
    venueOpeningHours: null,
    venueContactEmail: null,
    venueInstagramUrl: null,
    venueFacebookUrl: null,
  };

  assert.equal(isExtractResponse(invalid), false);
});
