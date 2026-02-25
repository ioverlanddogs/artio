import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("admin artwork page renders header and inline row actions", () => {
  const pageSource = readFileSync("app/(admin)/admin/artwork/page.tsx", "utf8");
  const listSource = readFileSync("app/(admin)/admin/artwork/admin-artwork-list-client.tsx", "utf8");
  assert.match(pageSource, /AdminPageHeader title="Artwork"/);
  assert.match(listSource, /AdminInlineRowActions/);
  assert.match(listSource, /Delete permanently…/);
});

test("admin sidebar includes artwork link", () => {
  const layoutSource = readFileSync("app/(admin)/admin/layout.tsx", "utf8");
  assert.match(layoutSource, /href: "\/admin\/artwork", label: "Artwork"/);
});
