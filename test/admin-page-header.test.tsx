import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import AdminPageHeader from "../app/(admin)/admin/_components/AdminPageHeader";
;(globalThis as any).React = React

test("AdminPageHeader renders title", () => {
  const html = renderToStaticMarkup(<AdminPageHeader title="Events" />);
  assert.match(html, /Events/);
});

test("AdminPageHeader renders back link when provided", () => {
  const html = renderToStaticMarkup(
    <AdminPageHeader title="Edit event" backHref="/admin/events" backLabel="Back to events" />,
  );

  assert.match(html, /Back to events/);
  assert.match(html, /href="\/admin\/events"/);
});
