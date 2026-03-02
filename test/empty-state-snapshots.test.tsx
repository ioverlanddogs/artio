import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SavedSearchesEmptyState } from "../components/saved-searches/saved-searches-empty-state";
import { NotificationsEmptyState } from "../components/notifications/notifications-empty-state";
;(globalThis as any).React = React

test("saved searches empty state snapshot", () => {
  const html = renderToStaticMarkup(<SavedSearchesEmptyState />);
  assert.match(html, /Build your personal event radar/);
  assert.match(html, /href="\/search"/);
});

test("notifications empty state snapshot", () => {
  const html = renderToStaticMarkup(<NotificationsEmptyState />);
  assert.match(html, /No notifications yet/);
  assert.match(html, /href="\/events"/);
});
