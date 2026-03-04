import test from "node:test";
import assert from "node:assert/strict";
import { listPublishedEventsInSeriesWithDeps } from "@/lib/series-events";

test("listPublishedEventsInSeriesWithDeps fetches published related events", async () => {
  let capturedSeriesId = "";
  let capturedExcludedId = "";

  const rows = await listPublishedEventsInSeriesWithDeps(
    {
      findMany: async (args) => {
        capturedSeriesId = args.where.seriesId;
        capturedExcludedId = args.where.id.not;
        return [{ id: "event-2", slug: "artist-talk", title: "Artist Talk", startAt: new Date(), venue: { name: "Gallery" }, images: [] }];
      },
    },
    { seriesId: "series-1", excludeEventId: "event-1" },
  );

  assert.equal(capturedSeriesId, "series-1");
  assert.equal(capturedExcludedId, "event-1");
  assert.equal(rows.length, 1);
});
