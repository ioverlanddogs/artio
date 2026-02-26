import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("/api/my/dashboard route keeps auth guard and delegates payload building", () => {
  const source = readFileSync("app/api/my/dashboard/route.ts", "utf8");
  assert.match(source, /getSessionUser\(\)/);
  assert.match(source, /ensureDbUserForSession\(session\)/);
  assert.match(source, /getMyDashboard\(\{ userId, venueId \}\)/);
  assert.match(source, /Cache-Control": "no-store"/);
});
