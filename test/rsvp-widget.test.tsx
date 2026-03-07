import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RsvpWidget } from "@/components/events/rsvp-widget";
;(globalThis as any).React = React;

test("rsvp widget renders form", () => {
  const html = renderToStaticMarkup(
    <RsvpWidget
      eventSlug="spring-open"
      initialAvailability={{ available: 12, isSoldOut: false, isRsvpClosed: false, tiers: [] }}
    />,
  );
  assert.match(html, /Reserve your spot/);
  assert.match(html, /RSVP/);
});

test("rsvp widget shows sold-out state", () => {
  const html = renderToStaticMarkup(
    <RsvpWidget
      eventSlug="spring-open"
      initialAvailability={{ available: 0, isSoldOut: true, isRsvpClosed: false, tiers: [] }}
    />,
  );
  assert.match(html, /Sold out/);
});

test("rsvp widget closed state is shown", () => {
  const html = renderToStaticMarkup(
    <RsvpWidget
      eventSlug="spring-open"
      initialAvailability={{ available: 0, isSoldOut: false, isRsvpClosed: true, tiers: [] }}
    />,
  );
  assert.match(html, /RSVPs are now closed/);
});
