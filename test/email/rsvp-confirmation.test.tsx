import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/rsvp-confirmation";
import { renderAsync } from "./render-async";

test("rsvp-confirmation email snapshot", async (t) => {
  const payload = { eventTitle: "After Hours Drawing", eventSlug: "after-hours-drawing", venueName: "Canal Arts Center", startAt: "2026-04-12T19:00:00.000Z", venueAddress: "58 Canal St, New York, NY" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /After\ Hours\ Drawing/i);
  assert.match(html, /View\ event/i);
  t.assert.snapshot(html);
});
