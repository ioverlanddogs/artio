import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { CreateEventForm } from "@/app/my/events/_components/CreateEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string | string[] | undefined }>
}) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/events/new");

  const memberships = await db.venueMembership.findMany({
    where: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
    select: { venueId: true, venue: { select: { name: true } } },
  });

  if (memberships.length === 0) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Create event</h1>
        <section className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <h2 className="text-lg font-semibold">Create a venue first</h2>
          <p className="mt-1 text-sm">You need a venue profile before you can add events.</p>
          <Link className="mt-3 inline-flex rounded border border-amber-900 px-3 py-1.5 text-sm font-medium" href="/my/venues/new">Create venue</Link>
        </section>
      </main>
    );
  }

  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const params = await searchParams;
  const venueIdFromQuery = typeof params?.venueId === "string" ? params.venueId : undefined;
  const membershipVenueIds = new Set(memberships.map((membership) => membership.venueId));
  const preselectedVenueId = venueIdFromQuery && membershipVenueIds.has(venueIdFromQuery)
    ? venueIdFromQuery
    : memberships.length === 1
      ? memberships[0]!.venueId
      : undefined;

  const venues = memberships.map((membership) => ({ id: membership.venueId, name: membership.venue.name }));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create event</h1>
      <CreateEventForm
        venues={venues}
        defaultStartAt={startAt}
        defaultEndAt={endAt}
        defaultVenueId={preselectedVenueId}
        showCreateAnotherAction
      />
    </main>
  );
}
