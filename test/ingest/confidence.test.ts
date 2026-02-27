import test from "node:test";
import assert from "node:assert/strict";
import { computeConfidence, sanitizeReasons } from "@/lib/ingest/confidence";

const prevHigh = process.env.AI_INGEST_CONFIDENCE_HIGH_MIN;
const prevMedium = process.env.AI_INGEST_CONFIDENCE_MEDIUM_MIN;

test.after(() => {
  process.env.AI_INGEST_CONFIDENCE_HIGH_MIN = prevHigh;
  process.env.AI_INGEST_CONFIDENCE_MEDIUM_MIN = prevMedium;
});

test("complete candidate scores HIGH", () => {
  process.env.AI_INGEST_CONFIDENCE_HIGH_MIN = "75";
  process.env.AI_INGEST_CONFIDENCE_MEDIUM_MIN = "45";

  const result = computeConfidence({
    title: "Summer Opening Night",
    startAt: new Date("2026-07-01T19:00:00.000Z"),
    endAt: new Date("2026-07-01T22:00:00.000Z"),
    timezone: "UTC",
    locationText: "Main Hall",
    description: "A full evening program with artist talks, live score, and opening reception.",
    sourceUrl: "https://venue.example/events/2026-07-01/summer-opening",
  });

  assert.equal(result.band, "HIGH");
  assert.ok(result.score >= 75);
});

test("missing key fields scores LOW", () => {
  const result = computeConfidence({
    title: "New",
    startAt: null,
    endAt: null,
    timezone: null,
    locationText: null,
    description: "short",
    sourceUrl: "https://venue.example/",
  });

  assert.equal(result.band, "LOW");
  assert.ok(result.score <= 44);
});

test("generic title is penalized", () => {
  const result = computeConfidence({
    title: "Home",
    startAt: new Date("2026-07-01T19:00:00.000Z"),
    endAt: null,
    timezone: "UTC",
    locationText: "Main Hall",
    description: "A long enough description that still should get title penalty from generic name.",
    sourceUrl: "https://venue.example/events/home",
  });

  assert.ok(result.reasons.some((reason) => reason.includes("generic title")));
  assert.ok(result.score < 100);
});

test("threshold env controls bands", () => {
  process.env.AI_INGEST_CONFIDENCE_HIGH_MIN = "95";
  process.env.AI_INGEST_CONFIDENCE_MEDIUM_MIN = "50";

  const result = computeConfidence({
    title: "Talk",
    startAt: new Date("2026-07-01T19:00:00.000Z"),
    endAt: null,
    timezone: "UTC",
    locationText: null,
    description: "brief",
    sourceUrl: "https://venue.example/",
  });

  assert.equal(result.band, "MEDIUM");
});

test("sanitizeReasons bounds output", () => {
  const reasons = sanitizeReasons(Array.from({ length: 12 }).map((_, idx) => `reason-${idx}-${"x".repeat(100)}`));
  assert.equal(reasons.length, 8);
  assert.ok(reasons.every((reason) => reason.length <= 80));
});
