import test from "node:test";
import assert from "node:assert/strict";
import { getPublisherStatusLabel, toPublishBlockingIssues } from "@/lib/publish-intent";

test("status labels map to plain language", () => {
  assert.equal(getPublisherStatusLabel("DRAFT"), "Draft");
  assert.equal(getPublisherStatusLabel("IN_REVIEW"), "Under review");
  assert.equal(getPublisherStatusLabel("PUBLISHED"), "Live");
  assert.equal(getPublisherStatusLabel("REJECTED"), "Needs changes");
  assert.equal(getPublisherStatusLabel("ARCHIVED"), "Archived");
});

test("blocking issues are normalized", () => {
  const issues = toPublishBlockingIssues([{ id: "event-title", label: "Add title", href: "#title" }]);
  assert.deepEqual(issues, [{ key: "event-title", label: "Add title", href: "#title" }]);
});
