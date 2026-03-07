import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { db } from "@/lib/db";
import { publishedEventWhere } from "@/lib/publish-status";
import { getStripeClient } from "@/lib/stripe";
import { confirmCheckoutSession } from "@/lib/checkout-confirm";
import { enqueueNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ session_id?: string }> },
) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <PageShell>
        <Card className="section-stack p-6">
          <h1 className="type-h3">We couldn&apos;t verify your payment</h1>
          <p className="type-caption">Missing checkout session id.</p>
          <Link href={`/events/${slug}`} className="text-sm underline">Back to event</Link>
        </Card>
      </PageShell>
    );
  }

  const stripe = await getStripeClient();
  const result = await confirmCheckoutSession(sessionId, slug, {
    retrieveCheckoutSession: (id) => stripe.checkout.sessions.retrieve(id),
    findPublishedEventBySlug: (eventSlug) => db.event.findFirst({
      where: { slug: eventSlug, deletedAt: null, ...publishedEventWhere() },
      select: { slug: true, title: true },
    }),
    findRegistrationById: (registrationId) => db.registration.findUnique({
      where: { id: registrationId },
      select: { id: true, status: true, confirmationCode: true, guestEmail: true },
    }),
    updateRegistrationStatus: (registrationId, data) => db.registration.update({ where: { id: registrationId }, data }),
    enqueueNotification: (payload) => enqueueNotification(payload as never),
  });

  if (!result.ok) {
    return (
      <PageShell>
        <Card className="section-stack p-6">
          <h1 className="type-h3">We couldn&apos;t verify your payment</h1>
          <p className="type-caption">{result.message ?? "Please contact support if you were charged."}</p>
          <Link href={`/events/${result.eventSlug}`} className="text-sm underline">Back to event</Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card className="section-stack p-6">
        <h1 className="type-h3">Registration confirmed</h1>
        <p className="type-caption">You&apos;re booked for {result.eventTitle}.</p>
        <p className="text-2xl font-semibold" data-testid="confirmation-code">{result.confirmationCode}</p>
        <Link href={`/events/${result.eventSlug}`} className="text-sm underline">Back to event</Link>
      </Card>
    </PageShell>
  );
}
