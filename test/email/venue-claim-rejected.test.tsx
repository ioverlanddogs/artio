import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/venue-claim-rejected";
import { renderAsync } from "./render-async";

test("venue-claim-rejected email snapshot", async (t) => {
  const payload = {
    venueName: "Harbor Light Gallery",
    venueSlug: "harbor-light-gallery",
    reason: "Please upload an official utility bill.",
  };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, {
    venueName: payload.venueName,
    venueSlug: payload.venueSlug,
    reason: payload.reason,
  }));

  assert.match(subject, /Harbor\ Light\ Gallery/i);
  assert.match(html, /Try\ again/i);
  t.assert.snapshot(html);
});
