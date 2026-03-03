import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ForwardGeocodeError } from "../lib/geocode/forward";
import { handleRetryVenueGenerationGeocode } from "../lib/venue-generation/retry-geocode-run";

test("retry geocode updates missing venue coordinates and run counters", async () => {
  const venueUpdates: Array<Record<string, unknown>> = [];
  const itemUpdates: Array<Record<string, unknown>> = [];

  const res = await handleRetryVenueGenerationGeocode(
    new NextRequest("http://localhost/api/admin/venue-generation/runs/run-1/retry-geocode", { method: "POST" }),
    { params: Promise.resolve({ runId: "run-1" }) },
    {
      requireAdminFn: async () => ({ id: "admin-1" }) as never,
      geocodeFn: async () => ({ lat: -33.9, lng: 18.4 }),
      sleepFn: async () => undefined,
      dbClient: {
        venueGenerationRun: {
          findUnique: async () => ({ id: "run-1", geocodeFailureBreakdown: {} }),
          update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "run-1", ...data }),
        },
        venueGenerationRunItem: {
          findMany: async () => ([
            {
              id: "item-1",
              venueId: "venue-1",
              venue: {
                id: "venue-1",
                name: "Retry Venue",
                addressLine1: "1 Main",
                addressLine2: null,
                city: "Cape Town",
                region: "Western Cape",
                postcode: "8001",
                country: "ZA",
                lat: null,
                lng: null,
                timezone: null,
              },
            },
          ]),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            itemUpdates.push(data);
            return { id: "item-1" };
          },
        },
        venue: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            venueUpdates.push(data);
            return { id: "venue-1" };
          },
        },
      } as never,
    },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.ok, true);
  assert.equal(venueUpdates.length, 1);
  assert.equal(itemUpdates[0].geocodeStatus, "succeeded");
  assert.equal(venueUpdates[0].timezone, "Africa/Johannesburg");
});

test("retry geocode stops early when provider is rate limited", async () => {
  const res = await handleRetryVenueGenerationGeocode(
    new NextRequest("http://localhost/api/admin/venue-generation/runs/run-1/retry-geocode", { method: "POST" }),
    { params: Promise.resolve({ runId: "run-1" }) },
    {
      requireAdminFn: async () => ({ id: "admin-1" }) as never,
      geocodeFn: async () => {
        throw new ForwardGeocodeError("rate_limited", "slow down");
      },
      sleepFn: async () => undefined,
      dbClient: {
        venueGenerationRun: {
          findUnique: async () => ({ id: "run-1", geocodeFailureBreakdown: {} }),
          update: async () => ({ id: "run-1" }),
        },
        venueGenerationRunItem: {
          findMany: async () => ([
            {
              id: "item-1",
              venueId: "venue-1",
              venue: {
                id: "venue-1",
                name: "Retry Venue",
                addressLine1: "1 Main",
                addressLine2: null,
                city: "Cape Town",
                region: "Western Cape",
                postcode: "8001",
                country: "ZA",
                lat: null,
                lng: null,
                timezone: null,
              },
            },
          ]),
          update: async () => ({ id: "item-1" }),
        },
        venue: { update: async () => ({ id: "venue-1" }) },
      } as never,
    },
  );

  const payload = await res.json();
  assert.equal(payload.ok, false);
  assert.match(payload.message, /rate limit/i);
});
