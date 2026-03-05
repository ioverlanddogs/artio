import test from "node:test";
import assert from "node:assert/strict";
import { getVenueGenerationRuns } from "@/lib/venue-generation/get-venue-generation-runs";

test("GET run items include publishable, blockers, and venueStatus", async () => {
  const readyVenueId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const missingCoordsVenueId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const alreadyPublishedVenueId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const skippedVenueId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  let inFilterIds: string[] = [];

  const runs = await getVenueGenerationRuns({
    requireAdminFn: async () => ({ id: "admin" }) as never,
    appDb: {
      venueGenerationRun: {
        findMany: async () => ([
          {
            id: "run-1",
            country: "GB",
            region: "England",
            status: "SUCCEEDED",
            totalReturned: 4,
            totalCreated: 3,
            totalSkipped: 1,
            totalFailed: 0,
            geocodeAttempted: 3,
            geocodeSucceeded: 3,
            geocodeFailed: 0,
            geocodeFailureBreakdown: {},
            autoPublishedCount: 0,
            triggeredById: "admin",
            createdAt: new Date().toISOString(),
            items: [
              {
                id: "item-ready",
                name: "Ready Venue",
                city: "London",
                postcode: "SW1A",
                country: "GB",
                status: "created",
                reason: null,
                venueId: readyVenueId,
                instagramUrl: null,
                facebookUrl: null,
                contactEmail: null,
                socialWarning: null,
                homepageImageStatus: "none",
                homepageImageCandidateCount: 0,
                geocodeStatus: "ok",
                geocodeErrorCode: null,
                timezoneWarning: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "item-missing-coords",
                name: "Missing Coords Venue",
                city: "London",
                postcode: "SW1A",
                country: "GB",
                status: "created",
                reason: null,
                venueId: missingCoordsVenueId,
                instagramUrl: null,
                facebookUrl: null,
                contactEmail: null,
                socialWarning: null,
                homepageImageStatus: "none",
                homepageImageCandidateCount: 0,
                geocodeStatus: "failed",
                geocodeErrorCode: "no_coords",
                timezoneWarning: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "item-already-published",
                name: "Already Published Venue",
                city: "London",
                postcode: "SW1A",
                country: "GB",
                status: "created",
                reason: null,
                venueId: alreadyPublishedVenueId,
                instagramUrl: null,
                facebookUrl: null,
                contactEmail: null,
                socialWarning: null,
                homepageImageStatus: "none",
                homepageImageCandidateCount: 0,
                geocodeStatus: "ok",
                geocodeErrorCode: null,
                timezoneWarning: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "item-skipped",
                name: "Skipped Venue",
                city: "London",
                postcode: "SW1A",
                country: "GB",
                status: "skipped",
                reason: "duplicate",
                venueId: skippedVenueId,
                instagramUrl: null,
                facebookUrl: null,
                contactEmail: null,
                socialWarning: null,
                homepageImageStatus: "none",
                homepageImageCandidateCount: 0,
                geocodeStatus: "ok",
                geocodeErrorCode: null,
                timezoneWarning: null,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ]) as never,
      },
      venue: {
        findMany: async ({ where }: { where: { id: { in: string[] } } }) => {
          inFilterIds = where.id.in;
          return [
            {
              id: readyVenueId,
              name: "Ready Venue",
              city: "London",
              country: "GB",
              lat: 51.5,
              lng: -0.1,
              status: "DRAFT",
            },
            {
              id: missingCoordsVenueId,
              name: "Missing Coords Venue",
              city: "London",
              country: "GB",
              lat: null,
              lng: null,
              status: "DRAFT",
            },
            {
              id: alreadyPublishedVenueId,
              name: "Already Published Venue",
              city: "London",
              country: "GB",
              lat: 51.5,
              lng: -0.1,
              status: "PUBLISHED",
            },
            {
              id: skippedVenueId,
              name: "Skipped Venue",
              city: "London",
              country: "GB",
              lat: null,
              lng: null,
              status: "DRAFT",
            },
          ];
        },
      },
    } as never,
  });

  assert.deepEqual(inFilterIds.sort(), [alreadyPublishedVenueId, missingCoordsVenueId, readyVenueId].sort());

  const items = runs[0]?.items ?? [];

  const readyItem = items.find((item) => item.id === "item-ready");
  assert.equal(readyItem?.publishable, true);
  assert.deepEqual(readyItem?.blockers, []);

  const missingCoordsItem = items.find((item) => item.id === "item-missing-coords");
  assert.equal(missingCoordsItem?.publishable, false);
  assert.ok(missingCoordsItem?.blockers.includes("Coordinates are required."));

  const publishedItem = items.find((item) => item.id === "item-already-published");
  assert.equal(publishedItem?.publishable, false);
  assert.deepEqual(publishedItem?.blockers, []);
  assert.equal(publishedItem?.venueStatus, "PUBLISHED");

  const skippedItem = items.find((item) => item.id === "item-skipped");
  assert.equal(skippedItem?.publishable, false);
  assert.deepEqual(skippedItem?.blockers, []);
});
