import type { PrismaClient, VenueSubscriptionStatus } from "@prisma/client";
import { getStripeClient } from "@/lib/stripe";

const VENUE_PRO_NAME = "Venue Pro";

export async function createVenueCheckoutSession(db: PrismaClient, input: { venueId: string; email: string; successUrl: string; cancelUrl: string }) {
  const stripe = await getStripeClient();
  const existing = await db.venueSubscription.findUnique({ where: { venueId: input.venueId } });

  const customerId = existing?.stripeCustomerId ?? (await (stripe as any).customers.create({
    email: input.email,
    metadata: { venueId: input.venueId },
  })).id as string;

  const session = await (stripe as any).checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{
      price_data: {
        currency: "usd",
        recurring: { interval: "month" },
        product_data: { name: VENUE_PRO_NAME },
        unit_amount: 4900,
      },
      quantity: 1,
    }],
    metadata: { venueId: input.venueId },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  await db.venueSubscription.upsert({
    where: { venueId: input.venueId },
    update: { stripeCustomerId: customerId },
    create: { venueId: input.venueId, stripeCustomerId: customerId, status: "INACTIVE" },
  });

  return { id: session.id as string, url: session.url as string | null };
}

export async function upsertVenueSubscriptionFromStripe(db: PrismaClient, input: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: VenueSubscriptionStatus;
  currentPeriodEnd: Date | null;
}) {
  const venue = await db.venueSubscription.findFirst({ where: { stripeCustomerId: input.stripeCustomerId }, select: { venueId: true } });
  if (!venue) return;

  await db.venueSubscription.update({
    where: { venueId: venue.venueId },
    data: {
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
    },
  });
}
