import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { enqueueNotification } from "@/lib/notifications";
import { getStripeClient } from "@/lib/stripe";
import { handlePostMyEventRegistrationRefund } from "@/lib/registration-refund-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string; rid: string }> }) {
  const { eventId, rid } = await params;
  const stripe = await getStripeClient();

  return handlePostMyEventRegistrationRefund(req, eventId, rid, {
    requireAuth,
    findRegistrationById: (registrationId) => db.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        eventId: true,
        guestEmail: true,
        status: true,
        stripePaymentIntentId: true,
        refundedAt: true,
        amountPaidGbp: true,
        event: { select: { title: true, slug: true } },
      },
    }),
    hasEventVenueMembership: async (targetEventId, userId) => {
      const count = await db.venueMembership.count({ where: { userId, venue: { events: { some: { id: targetEventId } } } } });
      return count > 0;
    },
    createStripeRefund: async ({ paymentIntentId, amount }) => stripe.refunds.create({ payment_intent: paymentIntentId, ...(amount != null ? { amount } : {}) }),
    updateRegistrationRefunded: async (registrationId, data) => {
      await db.registration.update({
        where: { id: registrationId },
        data: {
          refundedAt: data.refundedAt,
          refundedAmountGbp: data.refundedAmountGbp,
          cancelledAt: data.cancelledAt,
          status: "CANCELLED",
        },
      });
    },
    enqueueNotification: (payload) => enqueueNotification(payload as never),
    now: () => new Date(),
  });
}
