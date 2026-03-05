import test from "node:test";
import assert from "node:assert/strict";
import { extractHomepageImages } from "../lib/venue-generation/extract-homepage-images";

const allowUrl = async (_url: string) => new URL("https://example.com");

test("og:image extracted and returned as first candidate", async () => {
  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: allowUrl as never,
    fetchHtml: async () => ({ finalUrl: "https://venue.test", contentType: "text/html", html: '<meta property="og:image" content="/cover.jpg">', status: 200, bytes: 10 }) as never,
  });
  assert.ok(result);
  assert.equal(result?.candidates[0]?.source, "og_image");
  assert.equal(result?.candidates[0]?.url, "https://venue.test/cover.jpg");
});

test("multiple sources merged deduped and sorted", async () => {
  const html = `
    <meta property="og:image" content="/same.jpg">
    <meta name="twitter:image" content="/same.jpg">
    <link rel="preload" as="image" href="/pre.jpg">
    <header><img src="/hero.jpg"></header>
    <body><img src="/body.jpg" width="500"></body>
  `;

  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: async (url: string) => new URL(url),
    fetchHtml: async () => ({ finalUrl: "https://venue.test", contentType: "text/html", html, status: 200, bytes: 10 }) as never,
  });

  assert.deepEqual(result?.candidates.map((c) => c.url), [
    "https://venue.test/same.jpg",
    "https://venue.test/pre.jpg",
    "https://venue.test/hero.jpg",
    "https://venue.test/body.jpg",
  ]);
});

test("svg and favicon urls are excluded", async () => {
  const html = `<meta property='og:image' content='/logo.svg'><meta name='twitter:image' content='/favicon.ico'><img src='/ok.jpg' width='500'>`;
  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: async (url: string) => new URL(url),
    fetchHtml: async () => ({ finalUrl: "https://venue.test", contentType: "text/html", html, status: 200, bytes: 10 }) as never,
  });
  assert.deepEqual(result?.candidates.map((c) => c.url), ["https://venue.test/ok.jpg"]);
});

test("ssrf blocked urls are skipped while others returned", async () => {
  const html = `<meta property='og:image' content='https://127.0.0.1/a.jpg'><meta name='twitter:image' content='https://venue.test/b.jpg'>`;
  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: async (url: string) => {
      if (url.includes("127.0.0.1")) throw new Error("blocked");
      return new URL(url);
    },
    fetchHtml: async () => ({ finalUrl: "https://venue.test", contentType: "text/html", html, status: 200, bytes: 10 }) as never,
  });

  assert.deepEqual(result?.candidates.map((c) => c.url), ["https://venue.test/b.jpg"]);
});

test("null websiteUrl returns null", async () => {
  const result = await extractHomepageImages({
    websiteUrl: null,
    assertUrl: allowUrl as never,
    fetchHtml: async () => { throw new Error("should not run"); },
  });
  assert.equal(result, null);
});

test("fetchHtml throwing returns null", async () => {
  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: allowUrl as never,
    fetchHtml: async () => { throw new Error("boom"); },
  });
  assert.equal(result, null);
});

test("non-html content type returns null", async () => {
  const result = await extractHomepageImages({
    websiteUrl: "https://venue.test",
    assertUrl: allowUrl as never,
    fetchHtml: async () => ({ finalUrl: "https://venue.test", contentType: "image/jpeg", html: "", status: 200, bytes: 10 }) as never,
  });
  assert.equal(result, null);
});
