import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/event-change";
import { renderAsync } from "./render-async";

test("event-change email snapshot", async (t) => {
  const payload = { eventTitle: "After Hours Drawing", eventSlug: "after-hours-drawing", changedFields: ["Start time", "Ticket availability"] };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /After\ Hours\ Drawing/i);
  assert.match(html, /View\ updated\ event/i);
  t.assert.snapshot(html);
});
