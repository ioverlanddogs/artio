import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminVenueGenerationBulkPublish } from "../../lib/admin-venue-generation-bulk-publish-route";

const runId = "11111111-1111-4111-8111-111111111111";

test("happy path publishes ready venues and skips blocked ones", async () => {
  const publishedVenueIds: string[] = [];
  const auditVenueIds: string[] = [];

  const response = await handleAdminVenueGenerationBulkPublish(
    new Request(`http://localhost/api/admin/venue-generation/runs/${runId}/bulk-publish`, { method: "POST" }),
    { runId },
    "admin@example.com",
    {
      appDb: {
        venueGenerationRun: {
          findUnique: async () => ({ id: runId }),
        },
        venueGenerationRunItem: {
          findMany: async () => ([
            { venueId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
            { venueId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
            { venueId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
          ]),
        },
        venue: {
          findUnique: async ({ where }: { where: { id: string } }) => {
            if (where.id === "cccccccc-cccc-4ccc-8ccc-cccccccccccc") {
              return { id: where.id, country: "GB", lat: null, lng: null, name: "Missing Coords", city: "London" };
            }
            return { id: where.id, country: "GB", lat: 51.5, lng: -0.1, name: "Ready Venue", city: "London" };
          },
          update: async ({ where }: { where: { id: string } }) => {
            publishedVenueIds.push(where.id);
            return { id: where.id };
          },
        },
      } as never,
      logAction: async ({ targetId }) => {
        auditVenueIds.push(targetId as string);
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    ok: true,
    published: 2,
    skipped: 1,
    blockedVenueIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
  });
  assert.deepEqual(publishedVenueIds.sort(), [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ]);
  assert.deepEqual(auditVenueIds.sort(), [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ]);
});

test("invalid runId returns 400", async () => {
  const response = await handleAdminVenueGenerationBulkPublish(
    new Request("http://localhost/api/admin/venue-generation/runs/not-a-uuid/bulk-publish", { method: "POST" }),
    { runId: "not-a-uuid" },
    "admin@example.com",
  );

  assert.equal(response.status, 400);
});

test("run with no created items returns empty result", async () => {
  const response = await handleAdminVenueGenerationBulkPublish(
    new Request(`http://localhost/api/admin/venue-generation/runs/${runId}/bulk-publish`, { method: "POST" }),
    { runId },
    "admin@example.com",
    {
      appDb: {
        venueGenerationRun: {
          findUnique: async () => ({ id: runId }),
        },
        venueGenerationRunItem: {
          findMany: async () => [],
        },
        venue: {
          findUnique: async () => null,
          update: async () => ({ id: "" }),
        },
      } as never,
      logAction: async () => {},
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { ok: true, published: 0, skipped: 0, blockedVenueIds: [] });
});

test("audit log called once per published venue", async () => {
  let logCount = 0;
  const response = await handleAdminVenueGenerationBulkPublish(
    new Request(`http://localhost/api/admin/venue-generation/runs/${runId}/bulk-publish`, { method: "POST" }),
    { runId },
    "admin@example.com",
    {
      appDb: {
        venueGenerationRun: {
          findUnique: async () => ({ id: runId }),
        },
        venueGenerationRunItem: {
          findMany: async () => ([
            { venueId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
            { venueId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
          ]),
        },
        venue: {
          findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, country: "GB", lat: 1, lng: 1, name: "Ready", city: "X" }),
          update: async ({ where }: { where: { id: string } }) => ({ id: where.id }),
        },
      } as never,
      logAction: async () => {
        logCount += 1;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(logCount, 2);
});
