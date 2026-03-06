import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { SubmissionApprovedEmail as EmailTemplate, getSubject } from "@/lib/email/templates/submission-approved";
import { renderAsync } from "./render-async";

test("submission-approved email snapshot", async (t) => {
  const payload = {};
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /Submission\ approved/i);
  assert.match(html, /approved\ and\ published/i);
  t.assert.snapshot(html);
});
