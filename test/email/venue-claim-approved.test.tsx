import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/venue-claim-approved";
import { renderAsync } from "./render-async";

test("venue-claim-approved email snapshot", async (t) => {
  const payload = { venueName: "Harbor Light Gallery", dashboardUrl: "https://artpulse.co/my/venues/harbor-light" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /Harbor\ Light\ Gallery/i);
  assert.match(html, /Go\ to\ dashboard/i);
  t.assert.snapshot(html);
});
