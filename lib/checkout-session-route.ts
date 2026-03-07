import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { parseBody, zodDetails } from "@/lib/validators";
import { z } from "zod";

type SessionUser = { id: string };

type RegistrationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";

type EventRecord = {
  id: string;
  slug: string;
  title: string;
  venueId: string | null;
  ticketingMode: "EXTERNAL" | "RSVP" | "PAID" | null;
};

type TierRecord = {
  id: string;
  eventId: string;
  name: string;
  priceAmount: number;
  currency: string;
  isActive: boolean;
};

type StripeAccountRecord = {
  stripeAccountId: string;
  status: "PENDING" | "ACTIVE" | "RESTRICTED" | "DEAUTHORIZED";
  chargesEnabled: boolean;
};

type Deps = {
  getSessionUser: () => Promise<SessionUser | null>;
  findPublishedEventBySlug: (slug: string) => Promise<EventRecord | null>;
  findTicketTierById: (tierId: string) => Promise<TierRecord | null>;
  findStripeAccountByVenueId: (venueId: string) => Promise<StripeAccountRecord | null>;
  getPlatformFeePercent: () => Promise<number>;
  createRegistration: (data: {
    eventId: string;
    tierId: string;
    userId: string | null;
    guestName: string;
    guestEmail: string;
    quantity: number;
    status: RegistrationStatus;
    confirmationCode: string;
  }) => Promise<{ id: string; confirmationCode: string }>;
  createCheckoutSession: (params: {
    payment_method_types: ["card"];
    line_items: Array<{
      price_data: {
        currency: string;
        product_data: { name: string };
        unit_amount: number;
      };
      quantity: number;
    }>;
    application_fee_amount: number;
    transfer_data: { destination: string };
    customer_email: string;
    metadata: { registrationId: string; confirmationCode: string };
    success_url: string;
    cancel_url: string;
    mode: "payment";
  }) => Promise<{ id: string; url: string | null }>;
  generateConfirmationCode: () => string;
};

const bodySchema = z.object({
  tierId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  guestName: z.string().trim().min(1),
  guestEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function handlePostCheckoutSession(req: NextRequest, slug: string, deps: Deps) {
  const event = await deps.findPublishedEventBySlug(slug);
  if (!event) return apiError(404, "not_found", "Event not found");
  if (event.ticketingMode !== "PAID") return apiError(400, "invalid_request", "Paid checkout is not enabled for this event");

  const parsedBody = bodySchema.safeParse(await parseBody(req));
  if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

  const tier = await deps.findTicketTierById(parsedBody.data.tierId);
  if (!tier || tier.eventId !== event.id) return apiError(404, "not_found", "Ticket tier not found");
  if (!tier.isActive) return apiError(400, "invalid_request", "Ticket tier is not active");
  if (tier.priceAmount === 0) return apiError(400, "invalid_request", "Free tiers must use RSVP registration");

  if (!event.venueId) {
    return apiError(400, "invalid_request", "Venue does not have an active Stripe account");
  }

  const stripeAccount = await deps.findStripeAccountByVenueId(event.venueId);
  if (!stripeAccount || stripeAccount.status !== "ACTIVE" || !stripeAccount.chargesEnabled) {
    return apiError(400, "invalid_request", "Venue does not have an active Stripe account with charges enabled");
  }

  const [platformFeePercent, user] = await Promise.all([
    deps.getPlatformFeePercent(),
    deps.getSessionUser(),
  ]);

  const registration = await deps.createRegistration({
    eventId: event.id,
    tierId: tier.id,
    userId: user?.id ?? null,
    guestName: parsedBody.data.guestName,
    guestEmail: parsedBody.data.guestEmail,
    quantity: parsedBody.data.quantity,
    status: "PENDING",
    confirmationCode: deps.generateConfirmationCode(),
  });

  const totalAmount = tier.priceAmount * parsedBody.data.quantity;
  const applicationFeeAmount = Math.round((totalAmount * platformFeePercent) / 100);
  const baseUrl = req.nextUrl.origin;
  const session = await deps.createCheckoutSession({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: tier.currency.toLowerCase(),
        product_data: { name: tier.name },
        unit_amount: tier.priceAmount,
      },
      quantity: parsedBody.data.quantity,
    }],
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: stripeAccount.stripeAccountId },
    customer_email: parsedBody.data.guestEmail,
    metadata: {
      registrationId: registration.id,
      confirmationCode: registration.confirmationCode,
    },
    success_url: `${baseUrl}/events/${event.slug}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/events/${event.slug}`,
    mode: "payment",
  });

  return NextResponse.json({ sessionId: session.id, url: session.url }, { status: 201, headers: NO_STORE_HEADERS });
}
