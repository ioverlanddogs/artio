import assert from "node:assert/strict";
import test from "node:test";
import { ensureUniqueArtworkSlugWithDeps, slugifyArtworkTitle } from "@/lib/artwork-slug";
import { isArtworkIdKey, shouldRedirectArtworkIdKey } from "@/lib/artwork-route";
import { getArtworkPublicHref, publishedArtworksByArtistWhere, publishedArtworksByEventWhere, publishedArtworksByVenueWhere } from "@/lib/artworks";

test("slugifyArtworkTitle normalizes and avoids reserved words", () => {
  assert.equal(slugifyArtworkTitle("Hello, World!"), "hello-world");
  assert.equal(slugifyArtworkTitle("New"), "artwork-new");
});

test("ensureUniqueArtworkSlugWithDeps appends numeric suffixes", async () => {
  const used = new Set(["sample-title", "sample-title-2"]);
  const slug = await ensureUniqueArtworkSlugWithDeps({ findBySlug: async (candidate) => (used.has(candidate) ? { id: candidate } : null) }, "sample title");
  assert.equal(slug, "sample-title-3");
});

test("artwork route key helpers support id and slug routing behavior", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(isArtworkIdKey(id), true);
  assert.equal(isArtworkIdKey("my-artwork"), false);
  assert.equal(shouldRedirectArtworkIdKey(id, "my-artwork"), true);
  assert.equal(shouldRedirectArtworkIdKey("my-artwork", "my-artwork"), false);
});

test("published artwork relation where-builders enforce published-only filters", () => {
  assert.deepEqual(publishedArtworksByArtistWhere("artist-1"), { artistId: "artist-1", isPublished: true, deletedAt: null });
  assert.deepEqual(publishedArtworksByVenueWhere("venue-1"), { isPublished: true, deletedAt: null, venues: { some: { venueId: "venue-1" } } });
  assert.deepEqual(publishedArtworksByEventWhere("event-1"), { isPublished: true, deletedAt: null, events: { some: { eventId: "event-1" } } });
});

test("getArtworkPublicHref prefers slug while keeping id compatibility", () => {
  assert.equal(getArtworkPublicHref({ id: "art-1", slug: "my-work" }), "/artwork/my-work");
  assert.equal(getArtworkPublicHref({ id: "art-1", slug: null }), "/artwork/art-1");
});
