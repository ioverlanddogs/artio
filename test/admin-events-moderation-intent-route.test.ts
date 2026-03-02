import test from "node:test";
import assert from "node:assert/strict";
import { handleEventModerationIntent } from "../lib/admin-events-moderation-intent-route";

const params = { id: "11111111-1111-4111-8111-111111111111" };

test("approve_publish transitions status and returns publicUrl", async () => {
  let lastUpdate: Record<string, unknown> | null = null;
  const req = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve_publish" }) });
  const res = await handleEventModerationIntent(req, params, {
    requireAdminUser: async () => undefined,
    findEvent: async () => ({ id: params.id, slug: "my-event", deletedAt: null }),
    updateEvent: async (_id, data) => { lastUpdate = data; },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "PUBLISHED");
  assert.equal(body.publicUrl, "/events/my-event");
  assert.equal(lastUpdate?.status, "PUBLISHED");
});

test("request_changes requires reason and sets CHANGES_REQUESTED", async () => {
  const badReq = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request_changes" }) });
  const badRes = await handleEventModerationIntent(badReq, params, {
    requireAdminUser: async () => undefined,
    findEvent: async () => ({ id: params.id, slug: "x", deletedAt: null }),
    updateEvent: async () => undefined,
  });
  assert.equal(badRes.status, 400);

  let status = "";
  const okReq = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request_changes", reason: "Please fix date" }) });
  const okRes = await handleEventModerationIntent(okReq, params, {
    requireAdminUser: async () => undefined,
    findEvent: async () => ({ id: params.id, slug: "x", deletedAt: null }),
    updateEvent: async (_id, data) => { status = String(data.status); },
  });
  assert.equal(okRes.status, 200);
  assert.equal(status, "CHANGES_REQUESTED");
});

test("reject requires reason and sets REJECTED", async () => {
  const badReq = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
  const badRes = await handleEventModerationIntent(badReq, params, {
    requireAdminUser: async () => undefined,
    findEvent: async () => ({ id: params.id, slug: "x", deletedAt: null }),
    updateEvent: async () => undefined,
  });
  assert.equal(badRes.status, 400);

  let status = "";
  const okReq = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reject", reason: "Not suitable" }) });
  const okRes = await handleEventModerationIntent(okReq, params, {
    requireAdminUser: async () => undefined,
    findEvent: async () => ({ id: params.id, slug: "x", deletedAt: null }),
    updateEvent: async (_id, data) => { status = String(data.status); },
  });
  assert.equal(okRes.status, 200);
  assert.equal(status, "REJECTED");
});

test("non-admin access denied", async () => {
  const req = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve_publish" }) });
  const res = await handleEventModerationIntent(req, params, {
    requireAdminUser: async () => { throw new Error("forbidden"); },
    findEvent: async () => ({ id: params.id, slug: "x", deletedAt: null }),
    updateEvent: async () => undefined,
  });
  assert.equal(res.status, 403);
});
