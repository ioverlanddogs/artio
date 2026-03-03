import test from "node:test";
import assert from "node:assert/strict";
import { ForwardGeocodeError } from "../lib/geocode/forward";
import { runVenueGenerationPipeline } from "../lib/venue-generation/generation-pipeline";

function baseDb() {
  const createdItems: Array<Record<string, unknown>> = [];
  const createdVenues: Array<Record<string, unknown>> = [];
  const runs: Array<Record<string, unknown>> = [];

  return {
    createdItems,
    createdVenues,
    runs,
    db: {
      venue: {
        findFirst: async () => null,
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdVenues.push(data);
          return { id: `venue-${createdVenues.length}` };
        },
      },
      venueGenerationRun: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          runs.push({ phase: "create", ...data });
          return { id: "run-1" };
        },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          runs.push({ phase: "update", ...data });
          return { id: "run-1" };
        },
      },
      venueGenerationRunItem: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdItems.push(data);
          return { id: `item-${createdItems.length}` };
        },
      },
    },
  };
}

const openAiPayload = {
  output_parsed: {
    venues: [
      {
        name: "New Museum",
        addressLine1: "2 Main",
        addressLine2: null,
        city: "Cape Town",
        region: "Western Cape",
        postcode: null,
        country: "South Africa",
        contactEmail: null,
        contactPhone: null,
        websiteUrl: null,
        instagramUrl: null,
        openingHours: null,
        venueType: "MUSEUM",
      },
    ],
  },
};

test("venue generation pipeline records geocode success/no-match/failure", async () => {
  const state = baseDb();
  const geocodeResponses = [
    { lat: -33.9, lng: 18.4 },
    null,
    new ForwardGeocodeError("provider_error", "provider failed"),
  ];

  const response = {
    output_parsed: {
      venues: [
        { ...openAiPayload.output_parsed.venues[0], name: "Success Gallery" },
        { ...openAiPayload.output_parsed.venues[0], name: "No Match Gallery", postcode: "8001" },
        { ...openAiPayload.output_parsed.venues[0], name: "Failure Gallery", city: "Durban" },
      ],
    },
  };

  const result = await runVenueGenerationPipeline({
    input: { country: "South Africa", region: "Western Cape" },
    triggeredById: "11111111-1111-4111-8111-111111111111",
    db: state.db as never,
    openai: { createResponse: async () => response },
    geocode: async () => {
      const next = geocodeResponses.shift();
      if (next instanceof Error) throw next;
      return next ?? null;
    },
  });

  assert.equal(result.totalCreated, 3);
  assert.equal(result.geocodeAttempted, 3);
  assert.equal(result.geocodeSucceeded, 1);
  assert.equal(result.geocodeFailed, 1);
  assert.equal((result.geocodeFailureBreakdown as Record<string, number>).provider_error, 1);
  assert.equal(state.createdItems.length, 3);
  assert.deepEqual(state.createdItems.map((item) => item.geocodeStatus), ["succeeded", "no_match", "failed"]);
});

test("venue generation pipeline dedupe tiering uses postcode before city", async () => {
  const state = baseDb();
  const whereClauses: Array<Record<string, unknown>> = [];

  state.db.venue.findFirst = async ({ where }: { where: Record<string, unknown> }) => {
    whereClauses.push(where);
    if ((where.postcode as { equals?: string })?.equals === "8001") return { id: "dup-1" };
    return null;
  };

  const result = await runVenueGenerationPipeline({
    input: { country: "South Africa", region: "Western Cape" },
    triggeredById: "11111111-1111-4111-8111-111111111111",
    db: state.db as never,
    openai: {
      createResponse: async () => ({
        output_parsed: {
          venues: [
            { ...openAiPayload.output_parsed.venues[0], name: "Postcode Match", postcode: "8001", city: "Cape Town" },
            { ...openAiPayload.output_parsed.venues[0], name: "City Match", postcode: null, city: "Cape Town" },
            { ...openAiPayload.output_parsed.venues[0], name: "Name Country Only", postcode: null, city: null },
          ],
        },
      }),
    },
    geocode: async () => null,
  });

  assert.equal(result.totalSkipped, 1);
  assert.equal(state.createdVenues.length, 2);
  assert.equal((whereClauses[0].postcode as { equals?: string }).equals, "8001");
  assert.equal((whereClauses[1].city as { equals?: string }).equals, "Cape Town");
  assert.ok(!("city" in whereClauses[2]));
});
