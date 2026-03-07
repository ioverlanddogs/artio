import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { parseBody } from "@/lib/validators";

type SessionUser = { id: string };
type RegistrationStatus = "PENDING" | "CONFIRMED" | "WAITLISTED" | "CANCELLED";

type Deps = {
  requireAuth: () => Promise<SessionUser>;
  findRegistrationById: (registrationId: string) => Promise<{
    id: string;
    eventId: string;
    guestEmail: string;
    event: { title: string; slug: string | null };
    status: RegistrationStatus;
    stripePaymentIntentId: string | null;
    refundedAt: Date | null;
    amountPaidGbp: number | null;
  } | null>;
  hasEventVenueMembership: (eventId: string, userId: string) => Promise<boolean>;
  createStripeRefund: (args: { paymentIntentId: string; amount?: number }) => Promise<{ amount: number }>;
  updateRegistrationRefunded: (registrationId: string, data: { refundedAmountGbp: number; refundedAt: Date; cancelledAt: Date }) => Promise<void>;
  enqueueNotification: (args: {
    type: "REGISTRATION_CANCELLED";
    toEmail: string;
    dedupeKey: string;
    payload: Record<string, unknown>;
  }) => Promise<unknown>;
  now: () => Date;
};

const bodySchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function handlePostMyEventRegistrationRefund(req: NextRequest, eventId: string, registrationId: string, deps: Deps) {
  try {
    const user = await deps.requireAuth();

    const registration = await deps.findRegistrationById(registrationId);
    if (!registration || registration.eventId !== eventId) return apiError(404, "not_found", "Registration not found");

    const isMember = await deps.hasEventVenueMembership(eventId, user.id);
    if (!isMember) return apiError(403, "forbidden", "Venue membership required");

    if (registration.status !== "CONFIRMED") return apiError(400, "invalid_request", "Only confirmed registrations can be refunded");
    if (!registration.stripePaymentIntentId) return apiError(400, "invalid_request", "Registration has no payment intent");
    if (registration.refundedAt) return apiError(400, "invalid_request", "Registration already refunded");

    const parsedBody = bodySchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload");

    const amount = parsedBody.data.amount;
    if (amount != null && registration.amountPaidGbp != null && amount > registration.amountPaidGbp) {
      return apiError(400, "invalid_request", "Refund amount exceeds amount paid");
    }

    const stripeRefund = await deps.createStripeRefund({
      paymentIntentId: registration.stripePaymentIntentId,
      ...(amount != null ? { amount } : {}),
    });

    const now = deps.now();
    await deps.updateRegistrationRefunded(registration.id, {
      refundedAmountGbp: stripeRefund.amount,
      refundedAt: now,
      cancelledAt: now,
    });

    await deps.enqueueNotification({
      type: "REGISTRATION_CANCELLED",
      toEmail: registration.guestEmail,
      dedupeKey: `registration-refunded-${registration.id}`,
      payload: {
        type: "REGISTRATION_CANCELLED",
        eventTitle: registration.event.title,
        eventSlug: registration.event.slug,
        reason: parsedBody.data.reason,
        note: "A refund has been issued for your registration.",
      },
    });

    return NextResponse.json({ ok: true, refundedAmount: stripeRefund.amount }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
