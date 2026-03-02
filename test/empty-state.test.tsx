import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "../components/ui/empty-state";
;(globalThis as any).React = React

test("EmptyState renders title and actions", () => {
  const html = renderToStaticMarkup(
    <EmptyState
      title="No items"
      description="Start by creating one"
      actions={[
        { label: "Create", href: "/new" },
        { label: "Browse", href: "/browse", variant: "secondary" },
      ]}
    />,
  );

  assert.match(html, /No items/);
  assert.match(html, /Start by creating one/);
  assert.match(html, /href="\/new"/);
  assert.match(html, /Create/);
  assert.match(html, /href="\/browse"/);
  assert.match(html, /Browse/);
});
