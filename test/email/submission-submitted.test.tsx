import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { SubmissionSubmittedEmail as EmailTemplate, getSubject } from "@/lib/email/templates/submission-submitted";
import { renderAsync } from "./render-async";

test("submission-submitted email snapshot", async (t) => {
  const payload = { submissionType: "VENUE" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /Submission\ received/i);
  assert.match(html, /pending\ moderation/i);
  t.assert.snapshot(html);
});
