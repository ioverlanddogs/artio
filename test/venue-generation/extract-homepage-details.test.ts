import test from "node:test";
import assert from "node:assert/strict";
import { extractHomepageDetails } from "../../lib/venue-generation/extract-homepage-details";
import type { FetchedHomepage } from "../../lib/venue-generation/extract-homepage-images";

function fetched(html: string): FetchedHomepage {
  return { html, finalUrl: "https://venue.test", contentType: "text/html" };
}

test("description extracted from meta description and trimmed", () => {
  const result = extractHomepageDetails(fetched('<meta name="description" content="  This is a long venue description with enough content to be valid.  ">'));
  assert.equal(result.description, "This is a long venue description with enough content to be valid.");
});

test("description extracted from og:description when name missing", () => {
  const result = extractHomepageDetails(fetched('<meta property="og:description" content="This is an Open Graph description that is sufficiently long.">'));
  assert.equal(result.description, "This is an Open Graph description that is sufficiently long.");
});

test("description null when content too short", () => {
  const result = extractHomepageDetails(fetched('<meta name="description" content="Too short">'));
  assert.equal(result.description, null);
});

test("description null when no description tags", () => {
  const result = extractHomepageDetails(fetched("<html><body>No description</body></html>"));
  assert.equal(result.description, null);
});

test("contactEmail extracted from mailto link", () => {
  const result = extractHomepageDetails(fetched('<a href="mailto:hello@venue.test">Email</a>'));
  assert.equal(result.contactEmail, "hello@venue.test");
});

test("contactEmail extracted from bare email when no mailto", () => {
  const result = extractHomepageDetails(fetched("Contact us at gallery@venue.test for details"));
  assert.equal(result.contactEmail, "gallery@venue.test");
});

test("contactEmail null for noreply address", () => {
  const result = extractHomepageDetails(fetched("Reach us at noreply@venue.test"));
  assert.equal(result.contactEmail, null);
});

test("instagramUrl extracted from anchor href", () => {
  const result = extractHomepageDetails(fetched('<a href="https://instagram.com/venueprofile">Instagram</a>'));
  assert.equal(result.instagramUrl, "https://instagram.com/venueprofile");
});

test("instagramUrl null for bare instagram homepage", () => {
  const result = extractHomepageDetails(fetched('<a href="https://instagram.com/">Instagram</a>'));
  assert.equal(result.instagramUrl, null);
});

test("facebookUrl extracted from anchor href", () => {
  const result = extractHomepageDetails(fetched('<a href="https://facebook.com/venuepage">Facebook</a>'));
  assert.equal(result.facebookUrl, "https://facebook.com/venuepage");
});

test("openingHours extracted from hours class element", () => {
  const html = '<div class="opening-hours">Mon-Fri 10:00-18:00, Sat 11:00-16:00</div>';
  const result = extractHomepageDetails(fetched(html));
  assert.equal(result.openingHours, "Mon-Fri 10:00-18:00, Sat 11:00-16:00");
});

test("all fields null on empty html", () => {
  const result = extractHomepageDetails(fetched(""));
  assert.deepEqual(result, {
    description: null,
    openingHours: null,
    contactEmail: null,
    instagramUrl: null,
    facebookUrl: null,
  });
});
