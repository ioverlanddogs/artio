import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getVenueCompletionChecks } from "../lib/venues/venue-completion";

test("city + country marks location complete even when lat/lng are null", () => {
  const checks = getVenueCompletionChecks({
    name: "Venue",
    description: "Great space",
    city: "Bristol",
    country: "UK",
    lat: null,
    lng: null,
    images: [{ id: "img_1" }],
    websiteUrl: null,
    instagramUrl: null,
  });

  assert.equal(checks.location, true);
  assert.equal(checks.publishReady, true);
});

test("missing city or country keeps location incomplete", () => {
  const missingCity = getVenueCompletionChecks({
    name: "Venue",
    description: "Great space",
    city: null,
    country: "UK",
    images: [{ id: "img_1" }],
  });
  const missingCountry = getVenueCompletionChecks({
    name: "Venue",
    description: "Great space",
    city: "Bristol",
    country: null,
    images: [{ id: "img_1" }],
  });

  assert.equal(missingCity.location, false);
  assert.equal(missingCountry.location, false);
  assert.match(missingCity.missingRequired[0] ?? "", /city and country/i);
});

test("venue setup page uses first-visit defaults and readiness banner", () => {
  const page = readFileSync("app/my/venues/[id]/page.tsx", "utf8");

  assert.match(page, /firstRequired === "basic"/);
  assert.match(page, /This venue is ready to submit for review\./);
  assert.match(page, /Next: Location/);
});

test("publish panel keeps missing checklist and submit readiness wiring", () => {
  const panel = readFileSync("app/my/_components/VenuePublishPanel.tsx", "utf8");

  assert.match(panel, /What\&apos;s missing/);
  assert.match(panel, /checks\.missingRequired\.map/);
  assert.match(panel, /What happens next/);
  assert.match(panel, /isReady=\{checks\.publishReady && isOwner\}/);
});
