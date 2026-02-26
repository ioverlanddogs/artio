import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("venue edit page renders readiness checklist with venue submit CTA", () => {
  const page = readFileSync("app/my/venues/[id]/page.tsx", "utf8");
  const button = readFileSync("app/my/_components/VenueSubmitButton.tsx", "utf8");

  assert.match(page, /PublishReadinessChecklist title="Venue publish readiness"/);
  assert.match(page, /<VenueSubmitButton/);
  assert.match(button, /label: "Submit Venue for Review"/);
  assert.match(button, /helperText: "Ready to submit for approval\."/);
});
