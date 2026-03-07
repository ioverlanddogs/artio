import test from "node:test";
import assert from "node:assert/strict";
import { confirmCheckoutSession } from "@/lib/checkout-confirm";

function makeDeps(options?: {
  paymentStatus?: string;
  registrationStatus?: "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";
  hasRegistration?: boolean;
}) {
  let updatedToConfirmed = false;
  let notificationCount = 0;

  const deps: Parameters<typeof confirmCheckoutSession>[2] = {
    retrieveCheckoutSession: async () => ({
      payment_status: options?.paymentStatus ?? "paid",
      metadata: { registrationId: "reg-1", confirmationCode: "AP-ABC123" },
    }),
    findPublishedEventBySlug: async () => ({ slug: "spring-open", title: "Spring Open" }),
    findRegistrationById: async () => {
      if (options?.hasRegistration === false) return null;
      return {
        id: "reg-1",
        status: options?.registrationStatus ?? "PENDING",
        confirmationCode: "AP-ABC123",
        guestEmail: "jane@example.com",
      };
    },
    updateRegistrationStatus: async () => {
      updatedToConfirmed = true;
    },
    enqueueNotification: async () => {
      notificationCount += 1;
      return null;
    },
  };

  return { deps, wasUpdated: () => updatedToConfirmed, getNotificationCount: () => notificationCount };
}

test("confirms registration on paid checkout session", async () => {
  const { deps, wasUpdated, getNotificationCount } = makeDeps({ registrationStatus: "PENDING" });
  const result = await confirmCheckoutSession("cs_123", "spring-open", deps);

  assert.equal(result.ok, true);
  assert.equal(result.confirmationCode, "AP-ABC123");
  assert.equal(wasUpdated(), true);
  assert.equal(getNotificationCount(), 1);
});

test("is idempotent when already confirmed", async () => {
  const { deps, wasUpdated, getNotificationCount } = makeDeps({ registrationStatus: "CONFIRMED" });
  const result = await confirmCheckoutSession("cs_123", "spring-open", deps);

  assert.equal(result.ok, true);
  assert.equal(wasUpdated(), false);
  assert.equal(getNotificationCount(), 0);
});

test("returns error state for unpaid session", async () => {
  const { deps, wasUpdated } = makeDeps({ paymentStatus: "unpaid" });
  const result = await confirmCheckoutSession("cs_123", "spring-open", deps);

  assert.equal(result.ok, false);
  assert.equal(wasUpdated(), false);
});
