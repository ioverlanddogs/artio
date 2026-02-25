import test from "node:test";
import assert from "node:assert/strict";
import { fetchForYouRecommendations, shouldAttemptForYouFetch } from "../components/recommendations/for-you-client";

test("fetchForYouRecommendations attempts request regardless of auth client state", async () => {
  let called = false;
  const result = await fetchForYouRecommendations({
    fetchImpl: async () => {
      called = true;
      return Response.json({ windowDays: 7, items: [] });
    },
  });

  assert.equal(called, true);
  assert.equal(result.kind, "success");
});

test("fetchForYouRecommendations calls endpoint", async () => {
  let calledUrl: string | null = null;
  const result = await fetchForYouRecommendations({
    fetchImpl: async (input) => {
      calledUrl = String(input);
      return Response.json({ windowDays: 7, items: [] });
    },
  });

  assert.equal(calledUrl, "/api/recommendations/for-you?days=7&limit=20");
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

  assert.deepEqual(result, { kind: "success", data });
});
