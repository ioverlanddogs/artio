import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleBadge } from "../components/venues/role-badge";
import { UpcomingEventsPreview } from "../components/venues/upcoming-events-preview";
;(globalThis as any).React = React

test("RoleBadge renders readable labels", () => {
  const owner = renderToStaticMarkup(<RoleBadge role="OWNER" />);
  const editor = renderToStaticMarkup(<RoleBadge role="EDITOR" />);
  assert.match(owner, />Admin</);
  assert.match(editor, />Editor</);
});

test("UpcomingEventsPreview renders empty state", () => {
  const html = renderToStaticMarkup(<UpcomingEventsPreview items={[]} viewAllHref="/events?venue=abc" />);
  assert.match(html, /Upcoming events/);
  assert.match(html, /No upcoming events yet/);
  assert.match(html, /events\?venue=abc/);
});
