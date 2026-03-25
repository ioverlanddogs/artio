import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { buildActiveFilterChips } from "../lib/filter-storage";

test("active filter chip labels", () => {
  const chips = buildActiveFilterChips({ days: "30", radiusKm: "25" });
  const html = renderToStaticMarkup(<div>{chips.map((chip) => <span key={chip.key}>{chip.label}</span>)}</div>);
  assert.match(html, /Days: 30/);
  assert.match(html, /Radius \(km\): 25/);
});
