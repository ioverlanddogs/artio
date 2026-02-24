import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("/my overview renders quick list headings and status tiles", () => {
  const source = readFileSync("app/my/page.tsx", "utf8");
  assert.match(source, /Venues/);
  assert.match(source, /Upcoming events/);
  assert.match(source, /Recent artwork/);
  assert.match(source, /Venue \{status.toLowerCase\(\)\}/);
  assert.match(source, /Event \{status.toLowerCase\(\)\}/);
  assert.match(source, /Artwork \{status.toLowerCase\(\)\}/);
});

test("/my needs attention empty state renders", () => {
  const source = readFileSync("app/my/page.tsx", "utf8");
  assert.match(source, /Nothing needs attention — you&apos;re all caught up\./);
  assert.match(source, /data\.attention\.length === 0/);
});

test("header includes + Artwork and conditional artist profile CTA", () => {
  const header = readFileSync("app/my/_components/my-header-bar.tsx", "utf8");
  assert.match(header, /\+ Artwork/);
  assert.match(header, /!hasArtistProfile/);
  assert.match(header, /Create Artist Profile/);
});

test("/my layout includes shared shell components", () => {
  const layout = readFileSync("app/my/layout.tsx", "utf8");
  const header = readFileSync("app/my/_components/my-header-bar.tsx", "utf8");
  assert.match(layout, /MyShell/);
  assert.match(header, /Publisher Command Center/);
});
