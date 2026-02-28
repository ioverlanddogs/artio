import test from "node:test";
import assert from "node:assert/strict";
import { getVenuePublishIssues } from "../lib/venue-publish.ts";

const baseVenue = {
  name: "Gallery Aurora",
  description: "A contemporary gallery focused on experimental installations and long-form exhibitions.",
  featuredAssetId: "11111111-1111-4111-8111-111111111111",
  featuredImageUrl: null,
  addressLine1: "123 Main St",
  city: "Lisbon",
  country: "Portugal",
  websiteUrl: "https://aurora.example",
  images: [{ id: "22222222-2222-4222-8222-222222222222" }],
};

test("getVenuePublishIssues returns issue for missing description", () => {
  const issues = getVenuePublishIssues({ ...baseVenue, description: "Too short" });
  assert.equal(issues.some((issue) => issue.field === "description"), true);
});

test("getVenuePublishIssues returns issue when no cover image exists", () => {
  const issues = getVenuePublishIssues({ ...baseVenue, featuredAssetId: null, featuredImageUrl: null, images: [] });
  assert.equal(issues.some((issue) => issue.field === "coverImage"), true);
});

test("getVenuePublishIssues returns no issues for valid venue", () => {
  const issues = getVenuePublishIssues(baseVenue);
  assert.deepEqual(issues, []);
});


test("getVenuePublishIssues accepts 20-char description", () => {
  const issues = getVenuePublishIssues({ ...baseVenue, description: "12345678901234567890" });
  assert.equal(issues.some((issue) => issue.field === "description"), false);
});
