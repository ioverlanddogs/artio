import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
;(globalThis as any).React = React

test("Breadcrumbs renders home and provided links", () => {
  const html = renderToStaticMarkup(
    <Breadcrumbs items={[{ label: "Events", href: "/events" }, { label: "Open Studio", href: "/events/open-studio" }]} />,
  );

  assert.match(html, /Home/);
  assert.match(html, /Events/);
  assert.match(html, /Open Studio/);
  assert.match(html, /events\/open-studio/);
});
