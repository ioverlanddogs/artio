import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("artwork browse UI includes sort + filters + save search controls", () => {
  const browserSource = readFileSync("app/artwork/artwork-browser.tsx", "utf8");
  const sidebarSource = readFileSync("components/artwork/artwork-filter-sidebar.tsx", "utf8");

  assert.match(browserSource, /Most viewed \(30d\)/);
  assert.match(sidebarSource, /Has images/);
  assert.match(sidebarSource, /Has price/);
  assert.match(browserSource, /Save search/);
});
