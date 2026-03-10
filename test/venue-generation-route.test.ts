import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleVenueGenerationPost } from "../lib/venue-generation/admin-venue-generation-handler";
import { VenueGenerationError } from "../lib/venue-generation/generation-pipeline";

test("POST /api/admin/venue-generation returns 502 with stable code when model output is missing", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa", region: "Western Cape" }),
  });

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "11111111-1111-4111-8111-111111111111" }) as never,
    createOpenAiClientFn: async () => ({}) as never,
    runVenueGenerationPhase1Fn: async () => {
      throw new VenueGenerationError("OPENAI_BAD_OUTPUT", "OpenAI response did not include structured JSON output", {
        outputItems: 1,
      });
    },
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 502);
  const payload = await res.json();
  assert.equal(payload.error?.code, "OPENAI_BAD_OUTPUT");
  assert.match(payload.error?.message ?? "", /structured JSON output/i);
});

test("POST /api/admin/venue-generation returns 400 when country is missing", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ region: "Western Cape" }),
  });

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "admin-1" }) as never,
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 400);
});

test("POST /api/admin/venue-generation returns 400 when region is missing", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa" }),
  });

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "admin-1" }) as never,
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 400);
});

test("POST /api/admin/venue-generation returns 403 on forbidden or unauthorized requireAdmin message", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa", region: "Western Cape" }),
  });

  const forbiddenRes = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => {
      throw new Error("forbidden");
    },
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });
  assert.equal(forbiddenRes.status, 403);

  const unauthorizedRes = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => {
      throw new Error("unauthorized");
    },
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });
  assert.equal(unauthorizedRes.status, 403);
});

test("POST /api/admin/venue-generation returns 502 OPENAI_HTTP_ERROR", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa", region: "Western Cape" }),
  });

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "admin-2" }) as never,
    createOpenAiClientFn: async () => ({}) as never,
    runVenueGenerationPhase1Fn: async () => {
      throw new VenueGenerationError("OPENAI_HTTP_ERROR", "OpenAI HTTP error", { status: 502 });
    },
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 502);
  const payload = await res.json();
  assert.equal(payload.error?.code, "OPENAI_HTTP_ERROR");
});

test("POST /api/admin/venue-generation returns 502 OPENAI_SCHEMA_MISMATCH", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa", region: "Western Cape" }),
  });

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "admin-3" }) as never,
    createOpenAiClientFn: async () => ({}) as never,
    runVenueGenerationPhase1Fn: async () => {
      throw new VenueGenerationError("OPENAI_SCHEMA_MISMATCH", "Schema mismatch", { missing: ["city"] });
    },
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 502);
  const payload = await res.json();
  assert.equal(payload.error?.code, "OPENAI_SCHEMA_MISMATCH");
});

test("POST /api/admin/venue-generation returns 200 with run summary on success", async () => {
  const req = new NextRequest("http://localhost/api/admin/venue-generation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ country: "South Africa", region: "Western Cape" }),
  });

  const runResult = {
    runId: "run_123",
    totalReturned: 12,
    totalCreated: 8,
    totalSkipped: 4,
  };

  const res = await handleVenueGenerationPost(req, {
    requireAdminFn: async () => ({ id: "admin-4", email: "admin@example.com" }) as never,
    createOpenAiClientFn: async () => ({}) as never,
    runVenueGenerationPhase1Fn: async () => runResult as never,
    runJobFn: async () => ({ ok: true }) as never,
    dbClient: {} as never,
    openAiApiKey: "test-key",
  });

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.deepEqual(payload, runResult);
});
