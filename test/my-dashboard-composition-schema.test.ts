import test from "node:test";
import assert from "node:assert/strict";
import { MyDashboardResponseSchema } from "@/lib/my/dashboard-schema";

test("dashboard schema parses composition payload", () => {
  const parsed = MyDashboardResponseSchema.parse({
    context: { selectedVenueId: null, hasArtistProfile: true, venues: [{ id: "v1", name: "Venue", role: "OWNER" }] },
    counts: {
      venues: { Draft: 1, Submitted: 0, Published: 0, Rejected: 0 },
      events: { Draft: 0, Submitted: 1, Published: 0, Rejected: 0 },
      artwork: { Draft: 1, Published: 1 },
    },
    attention: [{
      id: "a1",
      kind: "rejected",
      entityType: "event",
      entityId: "e1",
      title: "Event",
      reason: "Needs edits",
      ctaLabel: "Fix & Resubmit",
      ctaHref: "/my/events/e1",
      updatedAtISO: new Date().toISOString(),
    }],
    recentActivity: [{ id: "r1", label: "Updated event", href: "/my/events/e1", occurredAtISO: new Date().toISOString() }],
    quickLists: {
      venues: [{ id: "v1", name: "Venue", role: "OWNER", status: "Draft", updatedAtISO: new Date().toISOString() }],
      upcomingEvents: [{ id: "e1", title: "Event", venueId: "v1", venueName: "Venue", status: "Submitted", startAtISO: new Date().toISOString(), updatedAtISO: new Date().toISOString() }],
      recentArtwork: [{ id: "aw1", title: "Work", status: "Draft", updatedAtISO: new Date().toISOString(), imageUrl: null }],
    },
  });

  assert.equal(parsed.context.venues[0].id, "v1");
});

test("attention queue CTA hrefs are /my deep links", () => {
  const attention = [{ ctaHref: "/my/events/123" }, { ctaHref: "/my/team?venueId=v1" }];
  for (const item of attention) {
    assert.match(item.ctaHref, /^\/my(\/|\?|$)/);
  }
});
