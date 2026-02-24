import test from "node:test";
import assert from "node:assert/strict";
import { fetchForYouRecommendations } from "../components/recommendations/for-you-client";

test("fetchForYouRecommendations skips fetch when unauthenticated", async () => {
  let called = false;
  const result = await fetchForYouRecommendations({
    status: "unauthenticated",
    fetchImpl: async () => {
      called = true;
      return new Response(null, { status: 200 });
    },
  });

  assert.equal(called, false);
  assert.deepEqual(result, { kind: "skipped" });
});

test("fetchForYouRecommendations calls endpoint when authenticated", async () => {
  let calledUrl: string | null = null;
  const result = await fetchForYouRecommendations({
    status: "authenticated",
    fetchImpl: async (input) => {
      calledUrl = String(input);
      return Response.json({ windowDays: 7, items: [] });
    },
  });

  assert.equal(calledUrl, "/api/recommendations/for-you?days=7&limit=20");
  assert.equal(result.kind, "success");
});
