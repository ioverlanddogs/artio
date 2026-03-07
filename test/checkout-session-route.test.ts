import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handlePostCheckoutSession } from "@/lib/checkout-session-route";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const TIER_ID = "22222222-2222-4222-8222-222222222222";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/events/spring-open/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeps(options?: {
  event?: { ticketingMode?: "EXTERNAL" | "RSVP" | "PAID" | null; venueId?: string | null } | null;
  tier?: { eventId?: string; isActive?: boolean; priceAmount?: number } | null;
  stripeAccount?: { status?: "PENDING" | "ACTIVE" | "RESTRICTED" | "DEAUTHORIZED"; chargesEnabled?: boolean } | null;
  platformFeePercent?: number;
}) {
  let capturedApplicationFeeAmount: number | null = null;

  const deps: Parameters<typeof handlePostCheckoutSession>[2] = {
    getSessionUser: async () => ({ id: "user-1" }),
    findPublishedEventBySlug: async () => {
      if (options?.event === null) return null;
      return {
        id: EVENT_ID,
        slug: "spring-open",
        title: "Spring Open",
        venueId: options?.event?.venueId ?? "venue-1",
        ticketingMode: options?.event?.ticketingMode ?? "PAID",
      };
    },
    findTicketTierById: async () => {
      if (options?.tier === null) return null;
      return {
        id: TIER_ID,
        eventId: options?.tier?.eventId ?? EVENT_ID,
        name: "General Admission",
        priceAmount: options?.tier?.priceAmount ?? 2500,
        currency: "GBP",
        isActive: options?.tier?.isActive ?? true,
      };
    },
    findStripeAccountByVenueId: async () => {
      if (options?.stripeAccount === null) return null;
      return {
        stripeAccountId: "acct_123",
        status: options?.stripeAccount?.status ?? "ACTIVE",
        chargesEnabled: options?.stripeAccount?.chargesEnabled ?? true,
      };
    },
    getPlatformFeePercent: async () => options?.platformFeePercent ?? 5,
    createRegistration: async () => ({ id: "reg-1", confirmationCode: "AP-ABC123" }),
    createCheckoutSession: async (params) => {
      capturedApplicationFeeAmount = params.application_fee_amount;
      return { id: "cs_123", url: "https://checkout.stripe.com/c/pay/cs_123" };
    },
    generateConfirmationCode: () => "AP-ABC123",
  };

  return { deps, getApplicationFeeAmount: () => capturedApplicationFeeAmount };
}

test("successful session creation returns checkout URL", async () => {
  const { deps } = makeDeps();
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, quantity: 2, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.sessionId, "cs_123");
  assert.equal(body.url, "https://checkout.stripe.com/c/pay/cs_123");
});

test("returns 400 when event ticketing mode is not PAID", async () => {
  const { deps } = makeDeps({ event: { ticketingMode: "RSVP" } });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 400);
});

test("returns 400 when no active stripe account", async () => {
  const { deps } = makeDeps({ stripeAccount: { status: "RESTRICTED", chargesEnabled: false } });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 400);
});

test("returns 404 for unknown event", async () => {
  const { deps } = makeDeps({ event: null });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, guestName: "Jane", guestEmail: "jane@example.com" }), "missing", deps);

  assert.equal(res.status, 404);
});

test("returns 404 for unknown tier", async () => {
  const { deps } = makeDeps({ tier: null });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 404);
});

test("returns 400 for free tier", async () => {
  const { deps } = makeDeps({ tier: { priceAmount: 0 } });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 400);
});

test("platform fee amount is rounded from total", async () => {
  const { deps, getApplicationFeeAmount } = makeDeps({ platformFeePercent: 7 });
  const res = await handlePostCheckoutSession(makeRequest({ tierId: TIER_ID, quantity: 3, guestName: "Jane", guestEmail: "jane@example.com" }), "spring-open", deps);

  assert.equal(res.status, 201);
  assert.equal(getApplicationFeeAmount(), 525);
});
