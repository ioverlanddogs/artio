import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { EventCard } from "../components/events/event-card";
;(globalThis as any).React = React

test("event card renders title date and link", () => {
  const html = renderToStaticMarkup(
    <EventCard title="Open Studio" startAt="2026-01-01T10:00:00.000Z" href="/events/open-studio" />,
  );
  assert.match(html, /Open Studio/);
  assert.match(html, /events\/open-studio/);
  assert.match(html, /2026/);
});
