import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import EmailTemplate, { getSubject } from "@/lib/email/templates/new-user-welcome";
import { renderAsync } from "./render-async";

test("new-user-welcome email snapshot", async (t) => {
  const payload = { userName: "Maya Rivera" };
  const subject = getSubject();
  const html = await renderAsync(createElement(EmailTemplate, { userName: payload.userName }));

  assert.match(subject, /Welcome\ to\ Artpulse/i);
  assert.match(html, /Explore\ events/i);
  t.assert.snapshot(html);
});
