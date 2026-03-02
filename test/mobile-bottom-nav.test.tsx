
import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileBottomNavInner } from "../components/navigation/mobile-bottom-nav";
;(globalThis as any).React = React

test("mobile nav renders safely for unauth users", () => {
  const html = renderToStaticMarkup(<MobileBottomNavInner isAuthenticated={false} pathname="/nearby" />);
  assert.match(html, /Home/);
  assert.match(html, /Calendar/);
  assert.doesNotMatch(html, /Sign in/);
});

test("mobile nav marks active route", () => {
  const html = renderToStaticMarkup(<MobileBottomNavInner isAuthenticated pathname="/venues" />);
  assert.match(html, /aria-current="page"/);
});
