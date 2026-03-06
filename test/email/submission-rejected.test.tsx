import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { SubmissionRejectedEmail as EmailTemplate, getSubject } from "@/lib/email/templates/submission-rejected";
import { renderAsync } from "./render-async";

test("submission-rejected email snapshot", async (t) => {
  const payload = { decisionReason: "Please include operating hours and a public website." };
  const subject = getSubject();
  const html = await renderAsync(createElement(EmailTemplate, { decisionReason: payload.decisionReason }));

  assert.match(subject, /Submission\ needs\ changes/i);
  assert.match(html, /Please\ include\ operating\ hours/i);
  t.assert.snapshot(html);
});
