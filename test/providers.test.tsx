import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Providers } from "../app/providers";
;(globalThis as any).React = React

test("Providers renders children inside SessionProvider without crashing", () => {
  const html = renderToStaticMarkup(
    <Providers>
      <div>wrapped child</div>
    </Providers>,
  );

  assert.match(html, /wrapped child/);
});
