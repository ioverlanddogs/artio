import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleDeleteTicketTier, handleGetTicketTiers, handlePatchTicketTier, handlePostTicketTier } from "@/lib/ticket-tier-route";

const eventId = "11111111-1111-4111-8111-111111111111";
const tierId = "22222222-2222-4222-8222-222222222222";

test("GET ticket tiers lists tiers ordered by sortOrder", async () => {
  const res = await handleGetTicketTiers(new NextRequest(`http://localhost/api/my/events/${eventId}/ticket-tiers`), Promise.resolve({ eventId }), {
    requireAuth: async () => ({ id: "user-1" }),
    findManagedEventById: async () => ({ id: eventId }),
    listTiersByEventId: async () => [
      { id: "tier-1", eventId, name: "General", description: null, priceAmount: 1000, currency: "GBP", capacity: 100, sortOrder: 0, isActive: true },
      { id: "tier-2", eventId, name: "VIP", description: "Perks", priceAmount: 2500, currency: "GBP", capacity: 20, sortOrder: 1, isActive: true },
    ],
    findMaxSortOrderByEventId: async () => 1,
    createTier: async () => {
      throw new Error("not used");
    },
    findTierByIdAndEventId: async () => null,
    updateTier: async () => {
      throw new Error("not used");
    },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.tiers.length, 2);
  assert.equal(body.tiers[0].sortOrder, 0);
  assert.equal(body.tiers[1].sortOrder, 1);
});

test("POST ticket tier creates tier with defaults", async () => {
  let captured: unknown;

  const req = new NextRequest(`http://localhost/api/my/events/${eventId}/ticket-tiers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Early Bird", priceAmount: 500 }),
  });

  const res = await handlePostTicketTier(req, Promise.resolve({ eventId }), {
    requireAuth: async () => ({ id: "user-1" }),
    findManagedEventById: async () => ({ id: eventId }),
    listTiersByEventId: async () => [],
    findMaxSortOrderByEventId: async () => 2,
    createTier: async (data) => {
      captured = data;
      return { id: tierId, ...data, description: data.description ?? null, capacity: data.capacity ?? null };
    },
    findTierByIdAndEventId: async () => null,
    updateTier: async () => {
      throw new Error("not used");
    },
  });

  assert.equal(res.status, 201);
  assert.deepEqual(captured, {
    eventId,
    name: "Early Bird",
    description: null,
    priceAmount: 500,
    currency: "GBP",
    capacity: null,
    sortOrder: 3,
    isActive: true,
  });
  const body = await res.json();
  assert.equal(body.sortOrder, 3);
});

test("PATCH ticket tier updates allowed fields", async () => {
  let captured: unknown;

  const req = new NextRequest(`http://localhost/api/my/events/${eventId}/ticket-tiers/${tierId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Standard", capacity: 200, sortOrder: 4, isActive: false }),
  });

  const res = await handlePatchTicketTier(req, Promise.resolve({ eventId, tierId }), {
    requireAuth: async () => ({ id: "user-1" }),
    findManagedEventById: async () => ({ id: eventId }),
    listTiersByEventId: async () => [],
    findMaxSortOrderByEventId: async () => 0,
    createTier: async () => {
      throw new Error("not used");
    },
    findTierByIdAndEventId: async () => ({ id: tierId, eventId, name: "General", description: null, priceAmount: 1000, currency: "GBP", capacity: null, sortOrder: 0, isActive: true }),
    updateTier: async (_id, data) => {
      captured = data;
      return { id: tierId, eventId, name: data.name ?? "General", description: null, priceAmount: 1000, currency: "GBP", capacity: data.capacity ?? null, sortOrder: data.sortOrder ?? 0, isActive: data.isActive ?? true };
    },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(captured, { name: "Standard", capacity: 200, sortOrder: 4, isActive: false });
});

test("DELETE ticket tier performs soft-delete", async () => {
  let captured: unknown;

  const res = await handleDeleteTicketTier(new NextRequest(`http://localhost/api/my/events/${eventId}/ticket-tiers/${tierId}`, { method: "DELETE" }), Promise.resolve({ eventId, tierId }), {
    requireAuth: async () => ({ id: "user-1" }),
    findManagedEventById: async () => ({ id: eventId }),
    listTiersByEventId: async () => [],
    findMaxSortOrderByEventId: async () => 0,
    createTier: async () => {
      throw new Error("not used");
    },
    findTierByIdAndEventId: async () => ({ id: tierId, eventId, name: "General", description: null, priceAmount: 1000, currency: "GBP", capacity: null, sortOrder: 0, isActive: true }),
    updateTier: async (_id, data) => {
      captured = data;
      return { id: tierId, eventId, name: "General", description: null, priceAmount: 1000, currency: "GBP", capacity: null, sortOrder: 0, isActive: false };
    },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(captured, { isActive: false });
  const body = await res.json();
  assert.equal(body.isActive, false);
});

test("returns 404 when user is not a venue member", async () => {
  const res = await handleGetTicketTiers(new NextRequest(`http://localhost/api/my/events/${eventId}/ticket-tiers`), Promise.resolve({ eventId }), {
    requireAuth: async () => ({ id: "user-1" }),
    findManagedEventById: async () => null,
    listTiersByEventId: async () => [],
    findMaxSortOrderByEventId: async () => null,
    createTier: async () => {
      throw new Error("not used");
    },
    findTierByIdAndEventId: async () => null,
    updateTier: async () => {
      throw new Error("not used");
    },
  });

  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error?.code, "not_found");
});
