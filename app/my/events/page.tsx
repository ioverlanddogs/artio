import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyEventsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; venueId?: string; sort?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/events");
  const { q = "", status, venueId, sort = "upcoming" } = await searchParams;

  const memberships = await db.venueMembership.findMany({ where: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } }, select: { venueId: true, venue: { select: { name: true } } } });
  const venueIds = memberships.map((v) => v.venueId);

  const events = await db.event.findMany({
    where: {
      venueId: venueId ? venueId : (venueIds.length ? { in: venueIds } : undefined),
      title: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    select: { id: true, title: true, slug: true, startAt: true, updatedAt: true, venueId: true, venue: { select: { name: true } }, isPublished: true, submissions: { where: { type: "EVENT" }, take: 1, orderBy: { updatedAt: "desc" }, select: { status: true } } },
    orderBy: sort === "updated" ? { updatedAt: "desc" } : { startAt: "asc" },
  });

  const filtered = events.filter((e) => {
    const s = e.isPublished ? "Published" : e.submissions[0]?.status === "REJECTED" ? "Rejected" : e.submissions[0]?.status === "SUBMITTED" ? "Submitted" : "Draft";
    return status ? s === status : true;
  });

  return (
    <main className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2"><input className="h-9 rounded border px-2 text-sm" defaultValue={q} name="q" placeholder="Search events" /><Button size="sm">Search</Button></form>
        <select name="venueId" defaultValue={venueId ?? ""} className="h-9 rounded border px-2 text-sm"><option value="">All venues</option>{memberships.map((m) => <option key={m.venueId} value={m.venueId}>{m.venue.name}</option>)}</select>
        {(["Draft", "Submitted", "Published", "Rejected"] as const).map((chip) => <Link key={chip} className="rounded border px-2 py-1 text-xs" href={`/my/events?status=${chip}`}>{chip}</Link>)}
        <Link className="rounded border px-2 py-1 text-xs" href="/my/events?sort=updated">Sort: Updated</Link>
        <Button asChild size="sm"><Link href="/my/events/new">+ Create event</Link></Button>
      </div>
      <table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Event</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th></tr></thead><tbody>
        {filtered.map((event) => {
          const submitted = event.submissions[0]?.status;
          return <tr className="border-b" key={event.id}><td className="p-2">{event.title}<div className="text-xs text-muted-foreground">{event.venue?.name ?? "No venue"}</div></td><td className="p-2">{event.isPublished ? "Published" : submitted ?? "Draft"}</td><td className="p-2 text-right space-x-2"><Link className="underline" href={`/my/events/${event.id}`}>Edit</Link><Link className="underline" href={`/api/my/events/${event.id}/submit`}>Submit/Resubmit</Link><Link className="underline" href={`/events/${event.slug}`}>View Public</Link>{event.isPublished ? <Link className="underline" href={`/api/my/venues/${event.venueId}/events/${event.id}/revisions`}>Create revision</Link> : null}</td></tr>;
        })}
      </tbody></table>
    </main>
  );
}
