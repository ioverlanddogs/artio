import test from "node:test";
import assert from "node:assert/strict";
import { getSessionCookiePresence, hasSessionCookieFromHeader } from "../lib/auth-debug";

test("session cookie detection supports secure cookie name", () => {
  const cookieHeader = "__Secure-next-auth.session-token=abc123; other=value";
  assert.equal(getSessionCookiePresence(cookieHeader), "secure");
  assert.equal(hasSessionCookieFromHeader(cookieHeader), true);
});

test("session cookie detection supports plain cookie name", () => {
  const cookieHeader = "next-auth.session-token=abc123; other=value";
  assert.equal(getSessionCookiePresence(cookieHeader), "plain");
  assert.equal(hasSessionCookieFromHeader(cookieHeader), true);
});

test("session cookie detection can report both cookie names", () => {
  const cookieHeader = "next-auth.session-token=one; __Secure-next-auth.session-token=two";
  assert.equal(getSessionCookiePresence(cookieHeader), "both");
  assert.equal(hasSessionCookieFromHeader(cookieHeader), true);
});

test("session cookie detection handles missing cookie header", () => {
  assert.equal(getSessionCookiePresence(null), "none");
  assert.equal(hasSessionCookieFromHeader(null), false);
});
