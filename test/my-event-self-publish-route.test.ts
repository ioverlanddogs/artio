import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleEventSelfPublish } from "@/lib/my-event-self-publish-route";

const eventId = "11111111-1111-4111-8111-111111111111";

function buildEvent(overrides: Partial<{ venue: { status?: string | null; isPublished?: boolean | null } | null; deletedAt: Date | null; isPublished: boolean }> = {}) {
  return {
    id: eventId,
    title: "Open studio",
    startAt: new Date("2026-01-10T20:00:00.000Z"),
    endAt: null,
    venueId: "venue-1",
    timezone: "Europe/London",
    ticketUrl: null,
    isPublished: false,
    deletedAt: null,
    status: "APPROVED",
    venue: { status: "PUBLISHED", isPublished: true },
    ...overrides,
  };
}

test("publish returns 409 publish_blocked when venue is not published", async () => {
  let state = buildEvent({ venue: { status: "DRAFT", isPublished: false } });
  const req = new NextRequest(`http://localhost/api/my/events/${eventId}/publish`, { method: "POST" });

  const res = await handleEventSelfPublish(req, { eventId, isPublished: true }, {
    requireAuth: async () => ({ id: "admin-1", email: "admin@example.com", role: "ADMIN" }),
    canEditEvent: async () => true,
    findEventForPublish: async () => state,
    updateEventPublishState: async (_, isPublished) => {
      state = { ...state, isPublished };
      return state;
    },
    logAdminAction: async () => undefined,
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "publish_blocked");
  assert.equal(body.blockers.some((blocker: { id: string }) => blocker.id === "venue"), true);
  assert.equal(state.isPublished, false);
});
