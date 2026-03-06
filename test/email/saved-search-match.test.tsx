import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { SavedSearchMatchEmail as EmailTemplate, getSubject } from "@/lib/email/templates/saved-search-match";
import { renderAsync } from "./render-async";

test("saved-search-match email snapshot", async (t) => {
  const payload = { searchName: "Brooklyn openings", eventTitle: "Neon Horizons", eventSlug: "neon-horizons" };
  const subject = getSubject(payload as never);
  const html = await renderAsync(createElement(EmailTemplate, payload));

  assert.match(subject, /Neon\ Horizons/i);
  assert.match(html, /View\ event/i);
  t.assert.snapshot(html);
});
