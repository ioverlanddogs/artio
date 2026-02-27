import test from "node:test";
import assert from "node:assert/strict";
import { normalizeText, scoreSimilarity, clusterCandidates, computeSimilarityKey } from "@/lib/ingest/similarity";

test("normalizeText lowercases and strips punctuation", () => {
  assert.equal(normalizeText("  The Gallery, Opening!  "), "gallery opening");
});

test("scoreSimilarity is high for near duplicates", () => {
  const score = scoreSimilarity(
    { title: "Summer Opening Night", startAt: new Date("2026-07-01T19:00:00.000Z"), locationText: "Main Hall" },
    { title: "Summer Opening", startAt: new Date("2026-07-01T20:00:00.000Z"), locationText: "Main Hall" },
  );

  assert.ok(score >= 85);
});

test("clusterCandidates is deterministic across runs", () => {
  const candidates = [
    { id: "b", venueId: "venue-1", title: "The Summer Opening", startAt: new Date("2026-07-01T19:00:00.000Z"), locationText: "Main Hall" },
    { id: "a", venueId: "venue-1", title: "Summer Opening", startAt: new Date("2026-07-01T19:30:00.000Z"), locationText: "Main Hall" },
    { id: "c", venueId: "venue-1", title: "Another Event", startAt: new Date("2026-07-01T19:30:00.000Z"), locationText: "Studio" },
  ].map((item) => ({ ...item, similarityKey: computeSimilarityKey(item) }));

  const first = clusterCandidates(candidates).assignments;
  const second = clusterCandidates(candidates).assignments;

  assert.deepEqual(first, second);
  assert.equal(first.filter((item) => item.isPrimary).length, 2);
});
