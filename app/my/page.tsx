import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { MyDashboardResponseSchema } from "@/lib/my/dashboard-schema";
import { getServerBaseUrl } from "@/lib/server/get-base-url";

function makeTabHref(path: "/my/venues" | "/my/events" | "/my/artwork", status: string, venueId?: string) {
  const params = new URLSearchParams({ status });
  if (venueId) {
    params.set("venueId", venueId);
  }
  return `${path}?${params.toString()}`;
}

async function getDashboard(venueId?: string) {
  const qs = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
  const baseUrl = await getServerBaseUrl();
  const res = await fetch(`${baseUrl}/api/my/dashboard${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  return MyDashboardResponseSchema.parse(await res.json());
}

export default async function MyDashboardPage({ searchParams }: { searchParams: Promise<{ venueId?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my");

  const { venueId } = await searchParams;
  const data = await getDashboard(venueId);
  if (!data) return <main><p>Unable to load dashboard.</p></main>;

  return (
    <main className="space-y-4">
      <section className="rounded border p-3">
        <h2 className="text-lg font-semibold">Needs attention</h2>
        {data.attention.length === 0 ? (
          <p className="mt-2 rounded border p-2 text-sm text-muted-foreground">Nothing needs attention — you&apos;re all caught up.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.attention.map((item) => (
              <li key={item.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground">{item.reason}</p>
                <Link className="underline" href={item.ctaHref}>{item.ctaLabel}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Status at a glance</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {(["Draft", "Submitted", "Published", "Rejected"] as const).map((status) => (
            <Link key={`venue-${status}`} href={makeTabHref("/my/venues", status, venueId)} className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Venue {status.toLowerCase()}</p>
              <p className="text-2xl font-semibold">{data.counts.venues[status]}</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {(["Draft", "Submitted", "Published", "Rejected"] as const).map((status) => (
            <Link key={`event-${status}`} href={makeTabHref("/my/events", status, venueId)} className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Event {status.toLowerCase()}</p>
              <p className="text-2xl font-semibold">{data.counts.events[status]}</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(["Draft", "Published"] as const).map((status) => (
            <Link key={`artwork-${status}`} href={makeTabHref("/my/artwork", status, venueId)} className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Artwork {status.toLowerCase()}</p>
              <p className="text-2xl font-semibold">{data.counts.artwork[status]}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Venues</h2>
          <Link className="text-sm underline" href={venueId ? `/my/venues?venueId=${venueId}` : "/my/venues"}>View all</Link>
        </div>
        <div className="space-y-2 text-sm">
          {data.quickLists.venues.map((venue) => (
            <article className="rounded border p-2" key={venue.id}>
              <p className="font-medium">{venue.name}</p>
              <p className="text-muted-foreground">{venue.status} · {new Date(venue.updatedAtISO).toLocaleDateString()}</p>
              <div className="mt-1 space-x-2">
                <Link className="underline" href={`/my/venues/${venue.id}`}>Edit</Link>
                <Link className="underline" href={`/my/venues/${venue.id}/submit-event`}>Submit Event</Link>
                {venue.status === "Published" ? <Link className="underline" href={`/venues/${venue.id}`}>View Public</Link> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming events</h2>
          <Link className="text-sm underline" href={venueId ? `/my/events?venueId=${venueId}` : "/my/events"}>View all</Link>
        </div>
        <div className="space-y-2 text-sm">
          {data.quickLists.upcomingEvents.map((event) => (
            <article className="rounded border p-2" key={event.id}>
              <p className="font-medium">{event.title}</p>
              <p className="text-muted-foreground">{new Date(event.startAtISO).toLocaleDateString()} · {event.venueName ?? "No venue"}</p>
              <div className="mt-1 space-x-2">
                <Link className="underline" href={`/my/events/${event.id}`}>Edit</Link>
                {event.status === "Published" ? <Link className="underline" href={`/events/${event.id}`}>View Public</Link> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent artwork</h2>
          <Link className="text-sm underline" href={venueId ? `/my/artwork?venueId=${venueId}` : "/my/artwork"}>View all</Link>
        </div>
        <div className="space-y-2 text-sm">
          {data.quickLists.recentArtwork.map((artwork) => (
            <article className="flex items-center gap-3 rounded border p-2" key={artwork.id}>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                {artwork.imageUrl ? <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="40px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{artwork.title}</p>
                <p className="text-muted-foreground">{artwork.status}</p>
              </div>
              <Link className="underline" href={`/my/artwork/${artwork.id}`}>Edit</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded border p-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {data.recentActivity.map((item) => <li key={item.id}><Link className="underline" href={item.href}>{item.label}</Link></li>)}
        </ul>
      </section>
    </main>
  );
}
