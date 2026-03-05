import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleVenueHomepageImageSelect } from "../lib/admin-venue-homepage-image-select-route";

const venueId = "11111111-1111-4111-8111-111111111111";
const candidateId = "22222222-2222-4222-8222-222222222222";

function buildReq() {
  return new NextRequest(`http://localhost/api/admin/venues/${venueId}/homepage-image-candidates/${candidateId}/select`, { method: "POST" });
}

function baseDeps(status = "pending") {
  return {
    requireAdminFn: async () => ({ id: "admin-1", email: "admin@example.com" }) as never,
    assertUrlFn: async (_url: string) => new URL("https://safe.example") as never,
    fetchImageFn: async () => ({ bytes: new Uint8Array([1]), contentType: "image/jpeg", sizeBytes: 1, finalUrl: "https://safe.example/img.jpg" }) as never,
    uploadVenueImageFn: async () => ({ url: "https://blob.example/img.jpg", path: "venues/img.jpg" }),
    addImageFn: async () => Response.json({ item: { id: "img-1" } }, { status: 201 }),
    dbClient: {
      venueHomepageImageCandidate: {
        findFirst: async () => ({ id: candidateId, url: "https://safe.example/img.jpg", status }),
        update: async () => ({ id: candidateId }),
      },
      adminAuditLog: { create: async () => ({ id: "audit-1" }) },
    },
  } as never;
}

test("success selects candidate and creates image", async () => {
  let updated = false;
  const deps = baseDeps();
  deps.dbClient.venueHomepageImageCandidate.update = async ({ data }: { data: { status: string } }) => {
    updated = data.status === "selected";
    return { id: candidateId };
  };

  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, deps);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.venueImageId, "img-1");
  assert.equal(updated, true);
});

test("404 when candidate not found", async () => {
  const deps = baseDeps();
  deps.dbClient.venueHomepageImageCandidate.findFirst = async () => null;
  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, deps);
  assert.equal(res.status, 404);
});

test("409 when candidate already selected", async () => {
  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, baseDeps("selected"));
  assert.equal(res.status, 409);
});

test("409 when candidate already rejected", async () => {
  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, baseDeps("rejected"));
  assert.equal(res.status, 409);
});

test("400 when assertSafeUrl throws", async () => {
  const deps = baseDeps();
  deps.assertUrlFn = async () => { throw new Error("unsafe"); };
  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, deps);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "unsafe_url");
});

test("400 when fetchImageWithGuards throws", async () => {
  const deps = baseDeps();
  deps.fetchImageFn = async () => { throw new Error("fetch failed"); };
  const res = await handleVenueHomepageImageSelect(buildReq(), { params: Promise.resolve({ id: venueId, candidateId }) }, deps);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "image_fetch_failed");
});
