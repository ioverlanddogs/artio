import test from "node:test";
import assert from "node:assert/strict";
import { validateModerationTransition, ModerationDecisionError } from "../lib/moderation-decision-service";

test("validateModerationTransition allows configured transitions", () => {
  assert.doesNotThrow(() => validateModerationTransition("DRAFT", "IN_REVIEW"));
  assert.doesNotThrow(() => validateModerationTransition("APPROVED", "PUBLISHED"));
});

test("validateModerationTransition throws 400 for invalid transitions", () => {
  assert.throws(
    () => validateModerationTransition("DRAFT", "PUBLISHED"),
    (error: unknown) => error instanceof ModerationDecisionError && error.status === 400 && error.code === "invalid_transition",
  );
});


test("validateModerationTransition reports deterministic invalid transition message", () => {
  assert.throws(
    () => validateModerationTransition("REJECTED", "PUBLISHED"),
    (error: unknown) => error instanceof ModerationDecisionError
      && error.status === 400
      && error.code === "invalid_transition"
      && error.message.includes("Invalid transition from REJECTED to PUBLISHED"),
  );
});
