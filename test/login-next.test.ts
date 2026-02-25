import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeNextPath } from "../lib/login-next";

test("sanitizeNextPath allows relative in-app paths", () => {
  assert.equal(sanitizeNextPath("/for-you"), "/for-you");
  assert.equal(sanitizeNextPath("/for-you?tab=all#top"), "/for-you?tab=all#top");
});

test("sanitizeNextPath rejects absolute/external paths", () => {
  assert.equal(sanitizeNextPath("https://evil.example/for-you", "/account"), "/account");
  assert.equal(sanitizeNextPath("//evil.example/for-you", "/account"), "/account");
  assert.equal(sanitizeNextPath("for-you", "/account"), "/account");
});
