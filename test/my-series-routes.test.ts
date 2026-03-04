import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleCreateSeries, handleGetVenueSeries } from "@/lib/my-series-routes";

const venueId = "11111111-1111-4111-8111-111111111111";

test("handleCreateSeries creates a series with generated slug", async () => {
  let createdSlug = "";
  const req = new NextRequest("http://localhost/api/my/series", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Opening Week", venueId }),
  });

  const res = await handleCreateSeries(req, {
    requireVenueRole: async () => undefined,
    findSeriesBySlug: async () => null,
    createSeries: async ({ title, slug, venueId: createVenueId }) => {
      createdSlug = slug;
      return { id: "series-1", title, slug, venueId: createVenueId };
    },
  });

  assert.equal(res.status, 201);
  assert.equal(createdSlug, "opening-week");
  const body = await res.json();
  assert.equal(body.slug, "opening-week");
});

test("handleGetVenueSeries returns list for venue", async () => {
  const res = await handleGetVenueSeries(Promise.resolve({ id: venueId }), {
    requireVenueRole: async () => undefined,
    listSeriesByVenue: async (id) => {
      assert.equal(id, venueId);
      return [{ id: "series-1", title: "Opening Week", slug: "opening-week" }];
    },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(Array.isArray(body.series), true);
  assert.equal(body.series[0].slug, "opening-week");
});
