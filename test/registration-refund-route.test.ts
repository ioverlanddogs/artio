import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handlePostMyEventRegistrationRefund } from "@/lib/registration-refund-route";

type Status = "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELLED";

function makeRequest(body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/my/events/event-1/registrations/reg-1/refund", {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeDeps(options?: {
  status?: Status;
  stripePaymentIntentId?: string | null;
  refundedAt?: Date | null;
  isVenueMember?: boolean;
}) {
  const notifications: Array<Record<string, unknown>> = [];
  const refunds: Array<{ paymentIntentId: string; amount?: number }> = [];

  return {
    notifications,
    refunds,
    deps: {
      requireAuth: async () => ({ id: "user-1" }),
      findRegistrationById: async () => ({
        id: "reg-1",
        eventId: "event-1",
        guestEmail: "guest@example.com",
        status: options?.status ?? "CONFIRMED",
        stripePaymentIntentId: options?.stripePaymentIntentId === undefined ? "pi_123" : options.stripePaymentIntentId,
        refundedAt: options?.refundedAt ?? null,
        amountPaidGbp: 5000,
        event: { title: "Spring Open", slug: "spring-open" },
      }),
      hasEventVenueMembership: async () => options?.isVenueMember ?? true,
      createStripeRefund: async (args: { paymentIntentId: string; amount?: number }) => {
        refunds.push(args);
        return { amount: args.amount ?? 5000 };
      },
      updateRegistrationRefunded: async () => undefined,
      enqueueNotification: async (payload: Record<string, unknown>) => {
        notifications.push(payload);
        return null;
      },
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    },
  };
}

test("successful full refund", async () => {
  const { deps, refunds } = makeDeps();
  const res = await handlePostMyEventRegistrationRefund(makeRequest(), "event-1", "reg-1", deps);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.refundedAmount, 5000);
  assert.equal(refunds.length, 1);
  assert.deepEqual(refunds[0], { paymentIntentId: "pi_123" });
});

test("successful partial refund", async () => {
  const { deps, refunds } = makeDeps();
  const res = await handlePostMyEventRegistrationRefund(makeRequest({ amount: 1250 }), "event-1", "reg-1", deps);

  assert.equal(res.status, 200);
  assert.equal(refunds[0]?.amount, 1250);
});

test("400 when already refunded", async () => {
  const { deps } = makeDeps({ refundedAt: new Date("2026-01-01T00:00:00.000Z") });
  const res = await handlePostMyEventRegistrationRefund(makeRequest(), "event-1", "reg-1", deps);
  assert.equal(res.status, 400);
});

test("400 when no payment intent", async () => {
  const { deps } = makeDeps({ stripePaymentIntentId: null });
  const res = await handlePostMyEventRegistrationRefund(makeRequest(), "event-1", "reg-1", deps);
  assert.equal(res.status, 400);
});

test("400 when not confirmed", async () => {
  const { deps } = makeDeps({ status: "WAITLISTED" });
  const res = await handlePostMyEventRegistrationRefund(makeRequest(), "event-1", "reg-1", deps);
  assert.equal(res.status, 400);
});

test("403 when not venue member", async () => {
  const { deps } = makeDeps({ isVenueMember: false });
  const res = await handlePostMyEventRegistrationRefund(makeRequest(), "event-1", "reg-1", deps);
  assert.equal(res.status, 403);
});

test("refund notification enqueued", async () => {
  const { deps, notifications } = makeDeps();
  await handlePostMyEventRegistrationRefund(makeRequest({ reason: "requested" }), "event-1", "reg-1", deps);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.type, "REGISTRATION_CANCELLED");
  assert.equal(notifications[0]?.toEmail, "guest@example.com");
});
