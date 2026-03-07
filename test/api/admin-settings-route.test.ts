import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAdminSettingsGet, handleAdminSettingsPatch } from "@/lib/admin-settings-route";

test("GET returns null ingest settings when row has no values", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", { method: "GET" });
  const res = await handleAdminSettingsGet(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    getSiteSettingsFn: async () => ({
      id: "default",
      ingestSystemPrompt: null,
      ingestModel: null,
      ingestMaxOutputTokens: null,
      emailEnabled: false,
      emailFromAddress: null,
      resendApiKey: null,
      resendFromAddress: null,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      platformFeePercent: 5,
      emailOutboxBatchSize: null,
    }) as never,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ingestSystemPrompt: null,
    ingestModel: null,
    ingestMaxOutputTokens: null,
    emailEnabled: false,
    emailFromAddress: null,
    resendApiKey: null,
    resendFromAddress: null,
    stripePublishableKey: null,
    stripeSecretKeySet: false,
    stripeWebhookSecretSet: false,
    platformFeePercent: 5,
    emailOutboxBatchSize: null,
  });
});

test("GET returns stripe secret booleans instead of raw values", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", { method: "GET" });
  const res = await handleAdminSettingsGet(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    getSiteSettingsFn: async () => ({
      id: "default",
      ingestSystemPrompt: null,
      ingestModel: null,
      ingestMaxOutputTokens: null,
      emailEnabled: false,
      emailFromAddress: null,
      resendApiKey: null,
      resendFromAddress: null,
      stripePublishableKey: "pk_test_123",
      stripeSecretKey: "sk_test_123",
      stripeWebhookSecret: "whsec_test_123",
      platformFeePercent: 7,
      emailOutboxBatchSize: null,
    }) as never,
  });

  const payload = await res.json() as Record<string, unknown>;
  assert.equal(res.status, 200);
  assert.equal(payload.stripeSecretKeySet, true);
  assert.equal(payload.stripeWebhookSecretSet, true);
  assert.equal(payload.stripeSecretKey, undefined);
  assert.equal(payload.stripeWebhookSecret, undefined);
});

test("PATCH updates and returns ingest settings", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ingestSystemPrompt: "custom prompt",
      ingestModel: "gpt-4o",
      ingestMaxOutputTokens: 8000,
      emailEnabled: true,
      emailFromAddress: "Artpulse <noreply@mail.artpulse.co>",
      resendApiKey: "re_test_123",
      resendFromAddress: "Artpulse <noreply@mail.artpulse.co>",
      stripePublishableKey: "pk_test_123",
      stripeSecretKey: "sk_test_123",
      stripeWebhookSecret: "whsec_test_123",
      platformFeePercent: 8,
      emailOutboxBatchSize: 50,
    }),
  });

  let captured: Record<string, unknown> | null = null;
  const res = await handleAdminSettingsPatch(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    updateSiteSettingsFn: async (data) => {
      captured = data as Record<string, unknown>;
      return { id: "default", ...data } as never;
    },
  });

  assert.deepEqual(captured, {
    ingestSystemPrompt: "custom prompt",
    ingestModel: "gpt-4o",
    ingestMaxOutputTokens: 8000,
    emailEnabled: true,
    emailFromAddress: "Artpulse <noreply@mail.artpulse.co>",
    resendApiKey: "re_test_123",
    resendFromAddress: "Artpulse <noreply@mail.artpulse.co>",
    stripePublishableKey: "pk_test_123",
    stripeSecretKey: "sk_test_123",
    stripeWebhookSecret: "whsec_test_123",
    platformFeePercent: 8,
    emailOutboxBatchSize: 50,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    settings: {
      ingestSystemPrompt: "custom prompt",
      ingestModel: "gpt-4o",
      ingestMaxOutputTokens: 8000,
      emailEnabled: true,
      emailFromAddress: "Artpulse <noreply@mail.artpulse.co>",
      resendApiKey: "re_test_123",
      resendFromAddress: "Artpulse <noreply@mail.artpulse.co>",
      stripePublishableKey: "pk_test_123",
      stripeSecretKeySet: true,
      stripeWebhookSecretSet: true,
      platformFeePercent: 8,
      emailOutboxBatchSize: 50,
    },
  });
});

test("PATCH allows clearing ingestSystemPrompt to null", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingestSystemPrompt: null }),
  });

  const res = await handleAdminSettingsPatch(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    updateSiteSettingsFn: async (data) => ({
      id: "default",
      ingestSystemPrompt: data.ingestSystemPrompt ?? null,
      ingestModel: null,
      ingestMaxOutputTokens: null,
      emailEnabled: false,
      emailFromAddress: null,
      resendApiKey: null,
      resendFromAddress: null,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      platformFeePercent: 5,
      emailOutboxBatchSize: null,
    }) as never,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    settings: {
      ingestSystemPrompt: null,
      ingestModel: null,
      ingestMaxOutputTokens: null,
      emailEnabled: false,
      emailFromAddress: null,
      resendApiKey: null,
      resendFromAddress: null,
      stripePublishableKey: null,
      stripeSecretKeySet: false,
      stripeWebhookSecretSet: false,
      platformFeePercent: 5,
      emailOutboxBatchSize: null,
    },
  });
});

test("PATCH persists all four stripe fields correctly", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      stripePublishableKey: "pk_live_123",
      stripeSecretKey: "sk_live_123",
      stripeWebhookSecret: "whsec_live_123",
      platformFeePercent: 12,
    }),
  });

  let captured: Record<string, unknown> | null = null;
  const res = await handleAdminSettingsPatch(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    updateSiteSettingsFn: async (data) => {
      captured = data as Record<string, unknown>;
      return {
        id: "default",
        ingestSystemPrompt: null,
        ingestModel: null,
        ingestMaxOutputTokens: null,
        emailEnabled: false,
        emailFromAddress: null,
        resendApiKey: null,
        resendFromAddress: null,
        stripePublishableKey: data.stripePublishableKey,
        stripeSecretKey: data.stripeSecretKey,
        stripeWebhookSecret: data.stripeWebhookSecret,
        platformFeePercent: data.platformFeePercent,
        emailOutboxBatchSize: null,
      } as never;
    },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(captured, {
    stripePublishableKey: "pk_live_123",
    stripeSecretKey: "sk_live_123",
    stripeWebhookSecret: "whsec_live_123",
    platformFeePercent: 12,
  });
});

test("PATCH rejects platformFeePercent values outside 1–100", async () => {
  for (const platformFeePercent of [0, 101]) {
    const req = new NextRequest("http://localhost/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platformFeePercent }),
    });

    const res = await handleAdminSettingsPatch(req, {
      requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
    });

    assert.equal(res.status, 400);
  }
});

test("PATCH returns 400 for invalid body", async () => {
  const req = new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingestMaxOutputTokens: -1 }),
  });

  const res = await handleAdminSettingsPatch(req, {
    requireAdminFn: async () => ({ id: "admin", email: "admin@example.com" }) as never,
  });

  assert.equal(res.status, 400);
});
