import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guardedFiles = [
  "app/(admin)/admin/_components/SubmissionsModeration.tsx",
  "app/(admin)/admin/moderation/moderation-client.tsx",
] as const;

test("admin moderation UI components avoid full-page reload calls", () => {
  for (const file of guardedFiles) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("window.location.reload("), false, `${file} should not call window.location.reload()`);
  }
});
