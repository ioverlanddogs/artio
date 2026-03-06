import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { VenueInviteEmail as EmailTemplate, getSubject } from "@/lib/email/templates/venue-invite";
import { renderAsync } from "./render-async";

test("venue-invite email snapshot", async (t) => {
  const payload = { inviteId: "inv_42", inviteToken: "token_abc123", venueId: "ven_77", role: "Manager" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /invited to manage a venue/i);
  assert.match(html, /Open\ invitation/i);
  t.assert.snapshot(html);
});
