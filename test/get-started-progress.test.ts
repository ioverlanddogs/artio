import test from "node:test";
import assert from "node:assert/strict";
import { computeGetStartedProgress } from "../lib/get-started";

test("computeGetStartedProgress derives step statuses and completion", () => {
  const result = computeGetStartedProgress({
    hasFollowed: true,
    hasLocation: false,
    hasSavedSearch: false,
    hasVisitedFollowing: false,
  });

  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 5);
  assert.equal(result.completedAll, false);
  assert.equal(result.currentStepNumber, 2);
  assert.deepEqual(result.steps.map((step) => step.done), [true, false, false, false, false]);
});

test("computeGetStartedProgress marks all complete", () => {
  const result = computeGetStartedProgress({
    hasFollowed: true,
    hasLocation: true,
    hasSavedSearch: true,
    hasVisitedFollowing: true,
  });

  assert.equal(result.totalCount, 5);
  assert.equal(result.completedCount, 5);
  assert.equal(result.completedAll, true);
  assert.equal(result.currentStepNumber, 5);
});
