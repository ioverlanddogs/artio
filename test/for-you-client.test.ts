import test from "node:test";
import assert from "node:assert/strict";
import { fetchForYouRecommendations, shouldAttemptForYouFetch } from "../components/recommendations/for-you-client";

test("fetchForYouRecommendations attempts request regardless of auth client state", async () => {
  let called = false;
  const result = await fetchForYouRecommendations({
    fetchImpl: async () => {
      called = true;
      return Response.json({ windowDays: 7, items: [{ score: 1, reasons: ["x"], event: { id: "1", title: "A", slug: "a", startAt: "2026-01-01T00:00:00.000Z", venue: null } }] });
    },
  });

  assert.equal(called, true);
  assert.equal(result.kind, "success");
});

test("fetchForYouRecommendations calls endpoint", async () => {
  const calledUrls: string[] = [];
  const result = await fetchForYouRecommendations({
    fetchImpl: async (input) => {
      calledUrls.push(String(input));
      return Response.json({ windowDays: 7, items: [{ score: 1, reasons: ["x"], event: { id: "1", title: "A", slug: "a", startAt: "2026-01-01T00:00:00.000Z", venue: null } }] });
    },
  });

  assert.equal(calledUrls[0], "/api/recommendations/for-you?days=7&limit=20");
  assert.equal(result.kind, "success");
});

test("fetchForYouRecommendations returns unauthorized on 401", async () => {
  const result = await fetchForYouRecommendations({
    fetchImpl: async () => new Response(null, { status: 401 }),
  });

  assert.deepEqual(result, { kind: "unauthorized" });
});

test("shouldAttemptForYouFetch allows one attempt and prevents retries when locked out or attempted", () => {
  assert.equal(shouldAttemptForYouFetch({ attempted: false, lockedOut: false }), true);
  assert.equal(shouldAttemptForYouFetch({ attempted: true, lockedOut: false }), false);
  assert.equal(shouldAttemptForYouFetch({ attempted: true, lockedOut: true }), false);
  assert.equal(shouldAttemptForYouFetch({ attempted: false, lockedOut: true }), false);
});

test("fetchForYouRecommendations returns success data for 200", async () => {
  const data = { windowDays: 7, items: [{ score: 1, reasons: ["x"], event: { id: "1", title: "A", slug: "a", startAt: "2026-01-01", venue: null } }] };
  const result = await fetchForYouRecommendations({
    fetchImpl: async () => Response.json(data),
  });

  assert.equal(result.kind, "success");
  if (result.kind !== "success") return;
  assert.equal(result.data.windowDays, 7);
  assert.equal(result.data.items[0]?.event.title, "A");
  assert.equal(result.data.items[0]?.reasonCategory, "trending");
});

test("fetchForYouRecommendations normalizes wrapped payload and title fallback", async () => {
  const result = await fetchForYouRecommendations({
    fetchImpl: async () => Response.json({ status: "ok", data: { windowDays: 30, items: [{ id: "1", name: "", startAt: "2026-01-01T00:00:00.000Z", venue: { name: "Club", slug: "club" } }] } }),
  });
  assert.equal(result.kind, "success");
  if (result.kind !== "success") return;
  assert.equal(result.data.windowDays, 30);
  assert.equal(result.data.items[0]?.event.title, "Untitled event");
  assert.equal(result.data.items[0]?.event.venue?.name, "Club");
});
