import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const submissionsSource = readFileSync("app/(admin)/admin/_components/SubmissionsModeration.tsx", "utf8");
const moderationSource = readFileSync("app/(admin)/admin/moderation/moderation-client.tsx", "utf8");
const moderationPage = readFileSync("app/(admin)/admin/moderation/page.tsx", "utf8");

test("submissions moderation uses row-level loading and refreshes via router", () => {
  assert.match(submissionsSource, /const \[loadingId, setLoadingId\]/);
  assert.match(submissionsSource, /const disableRowActions = isBulkRunning \|\| isLoading/);
  assert.match(submissionsSource, /router\.refresh\(\)/);
  assert.match(submissionsSource, /enqueueToast\(/);
});

test("moderation queue shows updated actions and refreshes via router", () => {
  assert.match(moderationSource, /Approve & Publish/);
  assert.match(moderationSource, /Request changes/);
  assert.match(moderationSource, /router\.refresh\(\)/);
  assert.match(moderationSource, /Bulk Approve & Publish/);
});

test("admin moderation page is canonical and uses AdminPageHeader", () => {
  assert.match(moderationPage, /<AdminPageHeader[\s\S]*title="Moderation"/);
  assert.doesNotMatch(moderationPage, /redirect\(/);
});
