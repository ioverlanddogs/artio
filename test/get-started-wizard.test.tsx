import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GetStartedWizardContent } from "../components/onboarding/get-started-wizard";
import { computeGetStartedProgress } from "../lib/get-started";
;(globalThis as any).React = React

test("wizard renders CTA labels for incomplete state", () => {
  const progress = computeGetStartedProgress({ hasFollowed: false, hasLocation: false, hasSavedSearch: false });
  const html = renderToStaticMarkup(<GetStartedWizardContent progress={progress} />);

  assert.match(html, /Browse venues/);
  assert.match(html, /Browse artists/);
  assert.match(html, /Update location/);
  assert.match(html, /Search events/);
  assert.match(html, /Saved searches/);
});
