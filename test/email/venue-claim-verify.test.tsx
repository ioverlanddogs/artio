import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/venue-claim-verify";
import { renderAsync } from "./render-async";

test("venue-claim-verify email snapshot", async (t) => {
  const payload = { venueName: "Harbor Light Gallery", verifyUrl: "https://artpulse.co/claims/verify/abc" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /Harbor\ Light\ Gallery/i);
  assert.match(html, /Verify\ claim/i);
  t.assert.snapshot(html);
});
