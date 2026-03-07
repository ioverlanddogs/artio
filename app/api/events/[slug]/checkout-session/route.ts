import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publishedEventWhere } from "@/lib/publish-status";
import { getSessionUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings/get-site-settings";
import { getStripeClient } from "@/lib/stripe";
import { handlePostCheckoutSession } from "@/lib/checkout-session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function nanoid(size = 21) {
  let out = "";
  for (let i = 0; i < size; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? "A";
  }
  return out;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stripe = await getStripeClient();

  return handlePostCheckoutSession(req, slug, {
    getSessionUser,
    findPublishedEventBySlug: (eventSlug) => db.event.findFirst({
      where: { slug: eventSlug, deletedAt: null, ...publishedEventWhere() },
      select: { id: true, slug: true, title: true, venueId: true, ticketingMode: true },
    }),
    findTicketTierById: (tierId) => db.ticketTier.findUnique({
      where: { id: tierId },
      select: { id: true, eventId: true, name: true, priceAmount: true, currency: true, isActive: true },
    }),
    findStripeAccountByVenueId: (venueId) => db.stripeAccount.findUnique({
      where: { venueId },
      select: { stripeAccountId: true, status: true, chargesEnabled: true },
    }),
    getPlatformFeePercent: async () => (await getSiteSettings()).platformFeePercent,
    createRegistration: (data) => db.registration.create({
      data,
      select: { id: true, confirmationCode: true },
    }),
    createCheckoutSession: (sessionArgs) => stripe.checkout.sessions.create(sessionArgs),
    generateConfirmationCode: () => `AP-${nanoid(6).toUpperCase()}`,
  });
}
