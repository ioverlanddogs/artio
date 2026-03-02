import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SavedSearchesEmptyState } from "../components/saved-searches/saved-searches-empty-state";
import { NotificationsEmptyState } from "../components/notifications/notifications-empty-state";
;(globalThis as any).React = React

test("saved searches empty state snapshot", () => {
  const html = renderToStaticMarkup(<SavedSearchesEmptyState />);
  assert.match(html, /Save searches to get weekly digests/);
  assert.match(html, /href="\/search"/);
  assert.match(html, /href="\/nearby"/);
  assert.match(html, /Learn how/);
  assert.match(html, /href="\/saved-searches"/);
});

test("notifications empty state snapshot", () => {
  const html = renderToStaticMarkup(<NotificationsEmptyState />);
  assert.match(html, /No notifications yet/);
  assert.match(html, /href="\/following"/);
  assert.match(html, /href="\/saved-searches"/);
  assert.match(html, /href="\/for-you"/);
});
