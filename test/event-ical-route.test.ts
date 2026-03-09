import test from "node:test";
import assert from "node:assert/strict";
import { handleEventIcalGet } from "@/lib/calendar/event-ical-route";

test("event iCal returns 200 and calendar content for published event", async () => {
  const response = await handleEventIcalGet(Promise.resolve({ slug: "my-event" }), {
    findEvent: async () => ({
      id: "event-1",
      title: "My Event",
      slug: "my-event",
      description: "Desc",
      startAt: new Date("2026-05-01T10:00:00.000Z"),
      endAt: new Date("2026-05-01T11:00:00.000Z"),
      venue: { name: "Venue", addressLine1: "Street" },
    }),
  } as never);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="my-event.ics"');
  const text = await response.text();
  assert.match(text, /BEGIN:VCALENDAR/);
  assert.match(text, /BEGIN:VEVENT/);
  assert.match(text, /SUMMARY:My Event/);
  assert.match(text, /END:VCALENDAR/);
});

test("event iCal returns 404 for unknown slug", async () => {
  const response = await handleEventIcalGet(Promise.resolve({ slug: "missing" }), {
    findEvent: async () => null,
  } as never);

  assert.equal(response.status, 404);
});

test("event iCal returns 404 for unpublished event", async () => {
  const response = await handleEventIcalGet(Promise.resolve({ slug: "draft" }), {
    findEvent: async () => null,
  } as never);

  assert.equal(response.status, 404);
});

test("event iCal falls back dtend to dtstart when endAt is null", async () => {
  const response = await handleEventIcalGet(Promise.resolve({ slug: "no-end" }), {
    findEvent: async () => ({
      id: "event-2",
      title: "No End",
      slug: "no-end",
      description: null,
      startAt: new Date("2026-07-01T12:00:00.000Z"),
      endAt: null,
      venue: null,
    }),
  } as never);

  const text = await response.text();
  const dtstart = text.match(/DTSTART:(\d{8}T\d{6}Z)/)?.[1];
  const dtend = text.match(/DTEND:(\d{8}T\d{6}Z)/)?.[1];
  assert.ok(dtstart);
  assert.equal(dtend, dtstart);
});
