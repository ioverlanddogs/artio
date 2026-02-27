import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("admin ingest list page includes trigger and runs sections", () => {
  const pageSource = readFileSync("app/(admin)/admin/ingest/page.tsx", "utf8");
  assert.match(pageSource, /title="Ingest"/);
  assert.match(pageSource, /IngestTriggerClient/);
  assert.match(pageSource, /Recent Runs/);
});

test("admin ingest run detail includes candidate moderation actions", () => {
  const detailSource = readFileSync("app\/(admin)\/admin\/ingest\/runs\/\[runId\]\/page.tsx", "utf8");
  const actionsSource = readFileSync("app/(admin)/admin/ingest/_components/ingest-candidate-actions.tsx", "utf8");
  assert.match(detailSource, /Extracted Candidates/);
  assert.match(actionsSource, /Approve/);
  assert.match(actionsSource, /Reject/);
  assert.match(actionsSource, /router\.refresh\(\)/);
});

test("admin sidebar includes ingest route", () => {
  const layoutSource = readFileSync("app/(admin)/admin/layout.tsx", "utf8");
  assert.match(layoutSource, /href: "\/admin\/ingest", label: "Ingest"/);
});
