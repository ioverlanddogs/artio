import test from "node:test";
import assert from "node:assert/strict";
import { runCronSyncGoogleEvents } from "@/lib/cron-sync-google-events";

test("submits recently published events", async () => {
  process.env.CRON_SECRET = "cron-secret";
  const calls: Array<{ url: string; type: string }> = [];

  const res = await runCronSyncGoogleEvents("cron-secret", {
    db: {
      event: {
        findMany: async (args: any) => (args.where.deletedAt ? [] : [{ slug: "published-1" }]),
      },
    },
    notifyFn: async (url, type) => {
      calls.push({ url, type });
    },
    now: new Date("2026-01-02T12:00:00.000Z"),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.submitted, 1);
  assert.deepEqual(calls, [{ url: "http://localhost:3000/events/published-1", type: "URL_UPDATED" }]);
});

test("submits recently deleted events", async () => {
  process.env.CRON_SECRET = "cron-secret";
  const calls: Array<{ url: string; type: string }> = [];

  const res = await runCronSyncGoogleEvents("cron-secret", {
    db: {
      event: {
        findMany: async (args: any) => (args.where.deletedAt ? [{ slug: "deleted-1" }] : []),
      },
    },
    notifyFn: async (url, type) => {
      calls.push({ url, type });
    },
    now: new Date("2026-01-02T12:00:00.000Z"),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.submitted, 1);
  assert.deepEqual(calls, [{ url: "http://localhost:3000/events/deleted-1", type: "URL_DELETED" }]);
});

test("cron auth check", async () => {
  process.env.CRON_SECRET = "cron-secret";
  const res = await runCronSyncGoogleEvents("wrong", {
    db: {
      event: { findMany: async () => [] },
    },
  });
  assert.equal(res.status, 401);
});
