import test from "node:test";
import assert from "node:assert/strict";
import { ensureUniqueSeriesSlugWithDeps, slugifySeriesTitle } from "../lib/series-slug";

test("series slug helper normalizes title", () => {
  assert.equal(slugifySeriesTitle("  Café Program  "), "cafe-program");
  assert.equal(slugifySeriesTitle("***"), "series");
});

test("series slug helper appends numeric suffixes for uniqueness", async () => {
  const existing = new Set(["autumn-talks", "autumn-talks-2"]);
  const slug = await ensureUniqueSeriesSlugWithDeps(
    { findBySlug: async (candidate) => (existing.has(candidate) ? { id: candidate } : null) },
    "Autumn Talks",
  );

  assert.equal(slug, "autumn-talks-3");
});
