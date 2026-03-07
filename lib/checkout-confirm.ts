type RegistrationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";

type CheckoutSession = {
  payment_status: string;
  amount_total?: number | null;
  metadata?: {
    registrationId?: string;
    confirmationCode?: string;
  };
};

type Deps = {
  retrieveCheckoutSession: (sessionId: string) => Promise<CheckoutSession | null>;
  findPublishedEventBySlug: (slug: string) => Promise<{ title: string; slug: string } | null>;
  findRegistrationById: (registrationId: string) => Promise<{
    id: string;
    status: RegistrationStatus;
    confirmationCode: string;
    guestEmail: string;
  } | null>;
  updateRegistrationStatus: (registrationId: string, data: { status: "CONFIRMED"; amountPaidGbp: number | null }) => Promise<unknown>;
  enqueueNotification: (params: {
    type: "REGISTRATION_CONFIRMED";
    toEmail: string;
    payload: Record<string, unknown>;
    dedupeKey: string;
  }) => Promise<unknown>;
};

export type CheckoutConfirmResult = {
  ok: boolean;
  eventSlug: string;
  eventTitle?: string;
  confirmationCode?: string;
  message?: string;
};

export async function confirmCheckoutSession(sessionId: string, slug: string, deps: Deps): Promise<CheckoutConfirmResult> {
  const event = await deps.findPublishedEventBySlug(slug);
  if (!event) return { ok: false, eventSlug: slug, message: "Event not found" };

  const session = await deps.retrieveCheckoutSession(sessionId);
  if (!session || session.payment_status !== "paid") {
    return { ok: false, eventSlug: event.slug, eventTitle: event.title, message: "Payment has not been completed" };
  }

  const registrationId = session.metadata?.registrationId;
  if (!registrationId) {
    return { ok: false, eventSlug: event.slug, eventTitle: event.title, message: "Registration could not be found" };
  }

  const registration = await deps.findRegistrationById(registrationId);
  if (!registration) {
    return { ok: false, eventSlug: event.slug, eventTitle: event.title, message: "Registration could not be found" };
  }

  if (registration.status === "PENDING") {
    await deps.updateRegistrationStatus(registration.id, { status: "CONFIRMED", amountPaidGbp: session.amount_total ?? null });
    await deps.enqueueNotification({
      type: "REGISTRATION_CONFIRMED",
      toEmail: registration.guestEmail,
      payload: { registrationId: registration.id },
      dedupeKey: `registration-confirmed:${registration.id}`,
    });
  }

  return {
    ok: true,
    eventSlug: event.slug,
    eventTitle: event.title,
    confirmationCode: registration.confirmationCode,
  };
}
