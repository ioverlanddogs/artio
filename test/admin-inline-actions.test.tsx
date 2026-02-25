import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDraftPatch,
  getNextEditingId,
  requestInlineArchiveToggle,
  requestInlinePatch,
} from "../app/(admin)/admin/_components/AdminInlineRowActions";
import { isHardDeleteConfirmMatch, requestHardDelete } from "../app/(admin)/admin/_components/AdminHardDeleteButton";

test("Edit save calls PATCH with JSON body", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const mockFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const payload = computeDraftPatch(
    { title: "Before", isPublished: false },
    { title: "After", isPublished: true },
  );

  await requestInlinePatch("/api/admin/events/evt_1", payload, mockFetch);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "/api/admin/events/evt_1");
  assert.equal(calls[0]?.init?.method, "PATCH");
  assert.equal(calls[0]?.init?.headers && (calls[0].init.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.equal(calls[0]?.init?.body, JSON.stringify({ title: "After", isPublished: true }));
});

test("Archive and restore call POST to expected URLs", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const mockFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  await requestInlineArchiveToggle("/api/admin/venues/ven_1/archive", mockFetch);
  await requestInlineArchiveToggle("/api/admin/venues/ven_1/restore", mockFetch);

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url, "/api/admin/venues/ven_1/archive");
  assert.equal(calls[1]?.url, "/api/admin/venues/ven_1/restore");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[1]?.init?.method, "POST");
});

test("Hard delete requires typing DELETE and uses DELETE method", async () => {
  assert.equal(isHardDeleteConfirmMatch("DELETE", "DELETE"), true);
  assert.equal(isHardDeleteConfirmMatch("delete", "DELETE"), false);

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const mockFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(null, { status: 204 });
  };

  await requestHardDelete("/api/admin/artists/art_1", mockFetch);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "/api/admin/artists/art_1");
  assert.equal(calls[0]?.init?.method, "DELETE");
});

test("Only one row editing at a time picks the latest row", () => {
  const rowA = getNextEditingId(null, "row-a");
  assert.equal(rowA, "row-a");

  const rowB = getNextEditingId(rowA, "row-b");
  assert.equal(rowB, "row-b");
});
