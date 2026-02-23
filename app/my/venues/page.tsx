import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyVenuesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/venues");
  const { q = "", status, sort = "updated" } = await searchParams;

  const memberships = await db.venueMembership.findMany({
    where: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
    include: { venue: { include: { targetSubmissions: { where: { type: "VENUE" }, orderBy: { updatedAt: "desc" }, take: 1 } } } },
    orderBy: sort === "name" ? { venue: { name: "asc" } } : { venue: { updatedAt: "desc" } },
  });

  const rows = memberships.filter((m) => {
    const s = m.venue.targetSubmissions[0]?.status;
    if (status === "Draft") return !m.venue.isPublished && s !== "SUBMITTED" && s !== "REJECTED";
    if (status === "Submitted") return s === "SUBMITTED";
    if (status === "Rejected") return s === "REJECTED";
    if (status === "Published") return m.venue.isPublished;
    return true;
  }).filter((m) => m.venue.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search venues" className="h-9 rounded border px-2 text-sm" /><Button size="sm" type="submit">Search</Button></form>
        {(["Draft", "Submitted", "Published", "Rejected"] as const).map((chip) => <Link key={chip} className="rounded border px-2 py-1 text-xs" href={`/my/venues?status=${chip}`}>{chip}</Link>)}
        <Link className="rounded border px-2 py-1 text-xs" href="/my/venues?sort=name">Sort: Name</Link>
        <Button asChild size="sm"><Link href="/my/venues/new">+ Create venue</Link></Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Venue</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th></tr></thead>
        <tbody>
          {rows.map((item) => {
            const latest = item.venue.targetSubmissions[0]?.status;
            const statusLabel = item.venue.isPublished ? "Published" : latest === "SUBMITTED" ? "Submitted" : latest === "REJECTED" ? "Rejected" : "Draft";
            return (
              <tr key={item.id} className="border-b">
                <td className="p-2">{item.venue.name}</td>
                <td className="p-2">{statusLabel}</td>
                <td className="p-2 text-right space-x-2">
                  <Link className="underline" href={`/my/venues/${item.venue.id}`}>Edit Venue</Link>
                  <Link className="underline" href={`/my/venues/${item.venue.id}/submit-event`}>Submit Event</Link>
                  <Link className="underline" href={`/venues/${item.venue.slug}`}>View Public</Link>
                  <Link className="underline" href={`/my/team?venueId=${item.venue.id}`}>Manage Team</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
