import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const submissionsSource = readFileSync("app/(admin)/admin/_components/SubmissionsModeration.tsx", "utf8");
const moderationSource = readFileSync("app/(admin)/admin/moderation/moderation-client.tsx", "utf8");

test("submissions moderation uses row-level loading and refreshes via router", () => {
  assert.match(submissionsSource, /const \[loadingId, setLoadingId\]/);
  assert.match(submissionsSource, /const disableRowActions = isBulkRunning \|\| isLoading/);
  assert.match(submissionsSource, /router\.refresh\(\)/);
  assert.match(submissionsSource, /enqueueToast\(/);
});

test("moderation queue actions use row-level loading and refreshes via router", () => {
  assert.match(moderationSource, /const \[loadingSubmissionId, setLoadingSubmissionId\]/);
  assert.match(moderationSource, /disabled=\{loadingSubmissionId === active\.submissionId\}/);
  assert.match(moderationSource, /router\.refresh\(\)/);
  assert.match(moderationSource, /enqueueToast\(/);
});

test("admin moderation route redirects to submissions and canonical page uses AdminPageHeader", () => {
  const moderationPage = readFileSync("app/(admin)/admin/moderation/page.tsx", "utf8");
  const submissionsPage = readFileSync("app/(admin)/admin/submissions/page.tsx", "utf8");

  assert.match(moderationPage, /redirect\("\/admin\/submissions"\)/);
  assert.match(submissionsPage, /<AdminPageHeader[\s\S]*title="Submissions"/);
});
