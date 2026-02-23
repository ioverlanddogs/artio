import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("/my dashboard page includes command center sections", () => {
  const source = readFileSync("app/my/page.tsx", "utf8");
  assert.match(source, /Needs attention/);
  assert.match(source, /Recent activity/);
  assert.match(source, /Venue drafts/);
  assert.match(source, /Events submitted/);
});

test("/my layout includes shared shell components", () => {
  const layout = readFileSync("app/my/layout.tsx", "utf8");
  const header = readFileSync("app/my/_components/my-header-bar.tsx", "utf8");
  assert.match(layout, /MyShell/);
  assert.match(header, /Publisher Command Center/);
});
