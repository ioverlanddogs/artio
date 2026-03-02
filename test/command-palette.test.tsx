import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandPaletteDialogPreview } from "../components/command-palette/command-palette";
;(globalThis as any).React = React

test("command palette preview toggles closed/open state and includes static commands", () => {
  const closedHtml = renderToStaticMarkup(<CommandPaletteDialogPreview isOpen={false} isAuthenticated={false} isAdmin={false} />);
  assert.match(closedHtml, /palette-closed/);

  const openHtml = renderToStaticMarkup(<CommandPaletteDialogPreview isOpen isAuthenticated={true} isAdmin={true} />);
  assert.match(openHtml, /For You/);
  assert.match(openHtml, /Following/);
  assert.match(openHtml, /Notifications/);
  assert.match(openHtml, /Saved Searches/);
  assert.match(openHtml, /My Venues/);
  assert.match(openHtml, /Get Started/);
  assert.match(openHtml, /Preferences/);
  assert.match(openHtml, /Admin/);
});
