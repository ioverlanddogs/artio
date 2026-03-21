import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("events hard delete route logs EVENT_HARD_DELETED audit action", () => {
  const source = readFileSync("app/api/admin/events/[id]/route.ts", "utf8");
  assert.match(source, /withAdminRoute\(async \(\{ actorEmail \}\) =>/);
  assert.match(source, /action: "EVENT_HARD_DELETED"/);
  assert.match(source, /targetType: "event"/);
  assert.match(source, /targetId: parsedId\.data\.id/);
});

test("artists hard delete route logs ARTIST_HARD_DELETED audit action", () => {
  const source = readFileSync("app/api/admin/artists/[id]/route.ts", "utf8");
  assert.match(source, /withAdminRoute\(async \(\{ actorEmail \}\) =>/);
  assert.match(source, /action: "ARTIST_HARD_DELETED"/);
  assert.match(source, /targetType: "artist"/);
  assert.match(source, /targetId: parsedId\.data\.id/);
});

test("artwork hard delete route logs ARTWORK_HARD_DELETED audit action", () => {
  const source = readFileSync("app/api/admin/artwork/[id]/route.ts", "utf8");
  assert.match(source, /withAdminRoute\(async \(\{ actorEmail \}\) =>/);
  assert.match(source, /action: "ARTWORK_HARD_DELETED"/);
  assert.match(source, /targetType: "artwork"/);
  assert.match(source, /targetId: parsedId\.data\.id/);
});
