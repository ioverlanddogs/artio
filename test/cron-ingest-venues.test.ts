import test from "node:test";
import assert from "node:assert/strict";
import { runCronIngestVenues } from "../lib/cron-ingest-venues.ts";

type MockRun = { venueId: string; createdAt: Date; status: "RUNNING" | "SUCCEEDED" | "FAILED" };

function createDb(venues: Array<{ id: string; websiteUrl: string | null }>, runs: MockRun[] = [], lockAcquired = true) {
  return {
    venue: {
      findMany: async () => venues,
    },
    ingestRun: {
      findFirst: async (args: { where: { venueId: string; status: { in: Array<"RUNNING" | "SUCCEEDED"> } } }) => {
        const latest = runs
          .filter((run) => run.venueId === args.where.venueId && args.where.status.in.includes(run.status))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return latest ? { createdAt: latest.createdAt } : null;
      },
    },
    $queryRaw: async () => [{ locked: lockAcquired }],
  };
}

test("cron ingest venues rejects unauthorized requests", async () => {
  process.env.CRON_SECRET = "expected";
  process.env.AI_INGEST_ENABLED = "1";

  const response = await runCronIngestVenues("wrong", {}, createDb([]));
  assert.equal(response.status, 401);
});

test("cron ingest venues skips when AI ingest is disabled", async () => {
  process.env.CRON_SECRET = "secret";
  process.env.AI_INGEST_ENABLED = "0";

  const response = await runCronIngestVenues("secret", {}, createDb([]));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.skipped, true);
  assert.equal(body.reason, "ingest_disabled");
});

test("cron ingest venues skips when lock is not acquired", async () => {
  process.env.CRON_SECRET = "secret";
  process.env.AI_INGEST_ENABLED = "1";

  const response = await runCronIngestVenues("secret", {}, createDb([], [], false));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.reason, "lock_not_acquired");
});

test("cron ingest venues dryRun lists venues without running extraction", async () => {
  process.env.CRON_SECRET = "secret";
  process.env.AI_INGEST_ENABLED = "1";

  const runCalls: Array<{ venueId: string; sourceUrl: string }> = [];
  const response = await runCronIngestVenues(
    "secret",
    { dryRun: "1", limit: "2", minHoursSinceLastRun: "24" },
    createDb(
      [
        { id: "venue-a", websiteUrl: "https://a.example" },
        { id: "venue-b", websiteUrl: "https://b.example" },
      ],
      [],
    ),
    {},
    {
      runExtraction: async (params) => {
        runCalls.push(params);
        return { runId: "run-1", createdCount: 1, dedupedCount: 0 };
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.dryRun, true);
  assert.equal(body.wouldRun, 2);
  assert.equal(body.runCount, 0);
  assert.equal(runCalls.length, 0);
  assert.equal(body.venues.length, 2);
  assert.equal(body.venues[0].status, "would_run");
});

test("cron ingest venues runs extraction with expected payload", async () => {
  process.env.CRON_SECRET = "secret";
  process.env.AI_INGEST_ENABLED = "1";

  const calls: Array<{ venueId: string; sourceUrl: string }> = [];
  const response = await runCronIngestVenues(
    "secret",
    { limit: "1", minHoursSinceLastRun: "24" },
    createDb([{ id: "venue-1", websiteUrl: "https://venue.one" }]),
    {},
    {
      runExtraction: async (params) => {
        calls.push(params);
        return { runId: "run-abc", createdCount: 3, dedupedCount: 2 };
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.runCount, 1);
  assert.equal(body.succeeded, 1);
  assert.equal(body.createdCandidates, 3);
  assert.equal(body.dedupedCandidates, 2);
  assert.deepEqual(calls, [{ venueId: "venue-1", sourceUrl: "https://venue.one" }]);
});
