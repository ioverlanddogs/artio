import test from "node:test";
import assert from "node:assert/strict";
import { notifyGoogleIndexing } from "@/lib/google-event-indexing";
import { handleMyEntityArchive } from "@/lib/my-entity-archive-route";
import { NextRequest } from "next/server";

test("no-op when disabled", async () => {
  let fetchCalled = false;
  await notifyGoogleIndexing("https://example.com/events/one", "URL_UPDATED", {
    getSiteSettingsFn: async () => ({ googleIndexingEnabled: false, googleServiceAccountJson: "{}" }) as never,
    fetchFn: async () => {
      fetchCalled = true;
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(fetchCalled, false);
});

test("no-op when key not set", async () => {
  let fetchCalled = false;
  await notifyGoogleIndexing("https://example.com/events/one", "URL_UPDATED", {
    getSiteSettingsFn: async () => ({ googleIndexingEnabled: true, googleServiceAccountJson: null }) as never,
    fetchFn: async () => {
      fetchCalled = true;
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(fetchCalled, false);
});

test("submits correct payload when enabled", async () => {
  const calls: Array<{ url: string; body: string | null; auth: string | null }> = [];
  await notifyGoogleIndexing("https://example.com/events/one", "URL_UPDATED", {
    getSiteSettingsFn: async () => ({
      googleIndexingEnabled: true,
      googleServiceAccountJson: JSON.stringify({ client_email: "svc@example.com", private_key: "secret" }),
    }) as never,
    getAccessTokenFn: async () => "token-123",
    fetchFn: async (url, init) => {
      calls.push({
        url: String(url),
        body: (init?.body as string) ?? null,
        auth: init?.headers ? (init.headers as Record<string, string>).authorization : null,
      });
      return new Response("{}", { status: 200 });
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://indexing.googleapis.com/v3/urlNotifications:publish");
  assert.equal(calls[0].auth, "Bearer token-123");
  assert.deepEqual(JSON.parse(calls[0].body ?? "{}"), { url: "https://example.com/events/one", type: "URL_UPDATED" });
});

test("URL_DELETED on archive", async () => {
  const notifications: Array<{ url: string; type: "URL_UPDATED" | "URL_DELETED" }> = [];
  const req = new NextRequest("http://localhost/api/my/events/1/archive", { method: "POST" });

  await handleMyEntityArchive(req, { id: "event-1" }, {
    requireAuth: async () => ({ id: "user-1" }),
    getEntityForUser: async () => ({ id: "event-1", slug: "my-event", deletedAt: null, deletedReason: null, deletedByAdminId: null }) as never,
    updateEntity: async () => ({ id: "event-1", slug: "my-event", deletedAt: new Date(), deletedReason: "publisher_archive", deletedByAdminId: null }) as never,
    onArchived: async (event) => {
      notifications.push({ url: `http://localhost:3000/events/${(event as { slug?: string }).slug}`, type: "URL_DELETED" });
    },
  });

  assert.deepEqual(notifications, [{ url: "http://localhost:3000/events/my-event", type: "URL_DELETED" }]);
});

test("never throws on API failure", async () => {
  await notifyGoogleIndexing("https://example.com/events/one", "URL_UPDATED", {
    getSiteSettingsFn: async () => ({
      googleIndexingEnabled: true,
      googleServiceAccountJson: JSON.stringify({ client_email: "svc@example.com", private_key: "secret" }),
    }) as never,
    getAccessTokenFn: async () => "token-123",
    fetchFn: async () => new Response("boom", { status: 500 }),
  });

  assert.ok(true);
});
