import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getNearbyVenues } from "../app/api/venues/nearby/route.ts";
import { db } from "../lib/db.ts";

const baseVenue = {
  id: "venue-a",
  slug: "venue-a",
  name: "Venue A",
  city: "Bristol",
  lat: 51.5,
  lng: -2.6,
  images: [],
};

test("GET /api/venues/nearby validates query params", async () => {
  const req = new NextRequest("http://localhost/api/venues/nearby?lat=200&lng=-2.6&radiusKm=10");
  const res = await getNearbyVenues(req);
  assert.equal(res.status, 400);
});

test("GET /api/venues/nearby returns only published in-radius venues", async () => {
  const originalFindMany = db.venue.findMany;
  db.venue.findMany = (async () => [
    { ...baseVenue, id: "inside", slug: "inside", lat: 51.5001, lng: -2.6001 },
    { ...baseVenue, id: "outside", slug: "outside", lat: 40.0, lng: -3.0 },
  ] as any) as typeof db.venue.findMany;

  try {
    const req = new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10");
    const res = await getNearbyVenues(req);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].id, "inside");
    assert.equal(body.items[0].image?.url, null);
    assert.equal(body.items[0].primaryImageUrl, null);
  } finally {
    db.venue.findMany = originalFindMany;
  }
});

test("GET /api/venues/nearby includes structured image field and legacy primaryImageUrl", async () => {
  const originalFindMany = db.venue.findMany;
  db.venue.findMany = (async () => [
    {
      ...baseVenue,
      id: "venue-image",
      slug: "venue-image",
      images: [{
        url: "https://legacy.example/venue.jpg",
        asset: {
          url: null,
          originalUrl: "https://blob.example/venue-original.jpg",
          processingStatus: "PROCESSING",
          processingError: null,
          variants: [],
        },
      }],
    },
  ] as any) as typeof db.venue.findMany;

  try {
    const res = await getNearbyVenues(new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].image.url, "https://blob.example/venue-original.jpg");
    assert.equal(body.items[0].image.source, "original");
    assert.equal(body.items[0].image.isProcessing, true);
    assert.equal(body.items[0].primaryImageUrl, "https://blob.example/venue-original.jpg");
  } finally {
    db.venue.findMany = originalFindMany;
  }
});

test("GET /api/venues/nearby handles image rows without asset relation", async () => {
  const originalFindMany = db.venue.findMany;
  db.venue.findMany = (async () => [
    {
      ...baseVenue,
      id: "venue-legacy-only",
      slug: "venue-legacy-only",
      images: [{
        url: "https://legacy.example/venue.jpg",
        asset: null,
      }],
    },
  ] as any) as typeof db.venue.findMany;

  try {
    const res = await getNearbyVenues(new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].image.url, "https://legacy.example/venue.jpg");
    assert.equal(body.items[0].image.source, "legacy");
    assert.equal(body.items[0].primaryImageUrl, "https://legacy.example/venue.jpg");
  } finally {
    db.venue.findMany = originalFindMany;
  }
});

test("GET /api/venues/nearby handles asset rows that do not include variants", async () => {
  const originalFindMany = db.venue.findMany;
  db.venue.findMany = (async () => [
    {
      ...baseVenue,
      id: "venue-asset-no-variants",
      slug: "venue-asset-no-variants",
      images: [{
        url: "https://legacy.example/venue.jpg",
        asset: {
          url: "https://blob.example/venue.jpg",
          originalUrl: null,
          processingStatus: null,
          processingError: null,
        },
      }],
    },
  ] as any) as typeof db.venue.findMany;

  try {
    const res = await getNearbyVenues(new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].image.url, "https://blob.example/venue.jpg");
    assert.equal(body.items[0].image.source, "asset");
  } finally {
    db.venue.findMany = originalFindMany;
  }
});

test("GET /api/venues/nearby falls back when Prisma schema is missing new fields", async () => {
  const originalFindMany = db.venue.findMany;
  const originalConsoleError = console.error;
  const calls: Array<any> = [];
  const errors: Array<unknown[]> = [];

  db.venue.findMany = (async (args: any) => {
    calls.push(args);
    if (calls.length === 1) {
      const err = new Error("column Asset.processingStatus does not exist") as Error & { code?: string };
      err.code = "P2022";
      throw err;
    }
    return [{
      ...baseVenue,
      id: "fallback-venue",
      slug: "fallback-venue",
      images: [{
        url: "https://legacy.example/fallback.jpg",
        asset: {
          url: "https://blob.example/fallback.jpg",
        },
      }],
    }] as any;
  }) as typeof db.venue.findMany;
  console.error = ((...args: unknown[]) => {
    errors.push(args);
  }) as typeof console.error;

  try {
    const res = await getNearbyVenues(new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].id, "fallback-venue");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].where.deletedAt, null);
    assert.equal("deletedAt" in calls[1].where, false);
    assert.equal(errors.some((entry) => entry[0] === "venues_nearby_schema_mismatch_fallback"), true);
  } finally {
    db.venue.findMany = originalFindMany;
    console.error = originalConsoleError;
  }
});

test("GET /api/venues/nearby returns structured internal error when DB query fails", async () => {
  const originalFindMany = db.venue.findMany;
  const originalConsoleError = console.error;
  const errors: Array<unknown[]> = [];
  db.venue.findMany = (async () => {
    throw new Error("db unavailable");
  }) as typeof db.venue.findMany;
  console.error = ((...args: unknown[]) => {
    errors.push(args);
  }) as typeof console.error;

  try {
    const res = await getNearbyVenues(new NextRequest("http://localhost/api/venues/nearby?lat=51.5&lng=-2.6&radiusKm=10"));
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.error.code, "internal_error");
    assert.equal(body.error.message, "Unexpected server error");
    assert.equal(errors.some((entry) => entry[0] === "venues_nearby_unexpected_error"), true);
  } finally {
    db.venue.findMany = originalFindMany;
    console.error = originalConsoleError;
  }
});
