import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeFacebookUrl, normalizeHttpsImageUrl, normalizeInstagramUrl } from "../lib/venues/normalize-social";

test("normalizeInstagramUrl normalizes accepted variants", () => {
  assert.equal(normalizeInstagramUrl("https://instagram.com/venue/").value, "https://www.instagram.com/venue");
  assert.equal(normalizeInstagramUrl("https://www.instagram.com/venue?utm_source=x").value, "https://www.instagram.com/venue");
});

test("normalizeInstagramUrl rejects non-instagram domains", () => {
  const result = normalizeInstagramUrl("https://example.com/venue");
  assert.equal(result.value, null);
  assert.equal(result.warning, "invalid_instagram_url");
});

test("normalizeFacebookUrl normalizes accepted variants", () => {
  assert.equal(normalizeFacebookUrl("https://facebook.com/my-page/").value, "https://www.facebook.com/my-page");
  assert.equal(normalizeFacebookUrl("https://www.facebook.com/my-page/posts/2").value, "https://www.facebook.com/my-page");
});

test("normalizeEmail validates email format", () => {
  assert.equal(normalizeEmail(" info@example.com ").value, "info@example.com");
  assert.equal(normalizeEmail("not-an-email").warning, "invalid_contact_email");
});

test("normalizeHttpsImageUrl requires https and likely image path", () => {
  assert.equal(normalizeHttpsImageUrl("https://cdn.example.com/images/venue").value, "https://cdn.example.com/images/venue");
  assert.equal(normalizeHttpsImageUrl("https://example.com/picture.jpg?foo=1").value, "https://example.com/picture.jpg?foo=1");
  assert.equal(normalizeHttpsImageUrl("http://example.com/picture.jpg").warning, "invalid_featured_image_url");
});
