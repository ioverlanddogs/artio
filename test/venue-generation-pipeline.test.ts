import test from "node:test";
import assert from "node:assert/strict";
import { runVenueGenerationPipeline } from "../lib/venue-generation/generation-pipeline";

test("venue generation pipeline dedupes and creates run audit", async () => {
  const created: Array<Record<string, unknown>> = [];
  const runs: Array<Record<string, unknown>> = [];
  const existing = [{ name: "Existing Gallery", city: "Cape Town" }];

  const result = await runVenueGenerationPipeline({
    input: { country: "South Africa", region: "Western Cape" },
    triggeredById: "11111111-1111-4111-8111-111111111111",
    db: {
      venue: {
        findMany: async () => existing,
        findUnique: async () => null,
        create: async ({ data }) => {
          created.push(data as Record<string, unknown>);
          return { id: `venue-${created.length}` };
        },
      },
      venueGenerationRun: {
        create: async ({ data }) => {
          runs.push(data);
          return { id: "run-1" };
        },
      },
    },
    openai: {
      createResponse: async () => ({
        output_parsed: {
          venues: [
            {
              name: "Existing Gallery",
              addressLine1: "1 Main",
              addressLine2: null,
              city: "Cape Town",
              region: "Western Cape",
              postcode: null,
              country: "South Africa",
              contactEmail: "info@example.com",
              contactPhone: null,
              websiteUrl: null,
              instagramUrl: null,
              openingHours: null,
              venueType: "GALLERY",
            },
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
      }),
    },
    geocode: async () => ({ lat: -33.9, lng: 18.4 }),
  });

  assert.equal(result.totalReturned, 2);
  assert.equal(result.totalCreated, 1);
  assert.equal(result.totalSkipped, 1);
  assert.equal(created.length, 1);
  assert.equal(created[0].aiGenerated, true);
  assert.equal(created[0].claimStatus, "UNCLAIMED");
  assert.equal(runs.length, 1);
});


test("venue generation pipeline parses structured payload from output.content.json", async () => {
  const result = await runVenueGenerationPipeline({
    input: { country: "South Africa", region: "Western Cape" },
    triggeredById: "11111111-1111-4111-8111-111111111111",
    db: {
      venue: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({ id: "venue-1" }),
      },
      venueGenerationRun: {
        create: async () => ({ id: "run-2" }),
      },
    },
    openai: {
      createResponse: async () => ({
        output: [
          {
            content: [
              {
                type: "json_schema",
                json: {
                  venues: [
                    {
                      name: "JSON Gallery",
                      addressLine1: "1 Main",
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
                      venueType: "GALLERY",
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    },
    geocode: async () => null,
  });

  assert.equal(result.totalReturned, 1);
  assert.equal(result.totalCreated, 1);
  assert.equal(result.totalSkipped, 0);
});
