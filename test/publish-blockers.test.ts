import test from "node:test";
import assert from "node:assert/strict";
import { computeEventPublishBlockers } from "../lib/publish-blockers";

const baseEvent = {
  startAt: new Date("2026-01-01T00:00:00.000Z"),
  timezone: "America/New_York",
  venue: { status: "PUBLISHED", isPublished: true },
};

test("computeEventPublishBlockers with hasImage: false returns coverImage blocker", () => {
  const blockers = computeEventPublishBlockers({ ...baseEvent, hasImage: false });
  assert.equal(blockers.some((blocker) => blocker.id === "coverImage"), true);
});

test("computeEventPublishBlockers with hasImage: true does not return coverImage blocker", () => {
  const blockers = computeEventPublishBlockers({ ...baseEvent, hasImage: true });
  assert.equal(blockers.some((blocker) => blocker.id === "coverImage"), false);
});

test("computeEventPublishBlockers without hasImage does not return coverImage blocker", () => {
  const blockers = computeEventPublishBlockers(baseEvent);
  assert.equal(blockers.some((blocker) => blocker.id === "coverImage"), false);
});
