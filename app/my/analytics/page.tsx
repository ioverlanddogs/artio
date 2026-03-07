import Link from "next/link";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeArtworkAnalytics } from "@/lib/artwork-analytics";
import { RegistrationsAnalyticsSection } from "@/app/my/analytics/registrations-section";

export default async function MyAnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/analytics");

  const artist = await db.artist.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!artist) {
    return <main className="space-y-4 p-6"><h1 className="text-2xl font-semibold">My Analytics</h1><p className="text-sm text-muted-foreground">Create your artist profile to unlock artwork analytics.</p></main>;
  }

  const artworks = await db.artwork.findMany({ where: { artistId: artist.id }, select: { id: true, title: true, slug: true, isPublished: true } });
  const start90 = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 89));
  const rows = artworks.length
    ? await db.pageViewDaily.findMany({ where: { entityType: "ARTWORK", entityId: { in: artworks.map((item) => item.id) }, day: { gte: start90 } }, select: { entityId: true, day: true, views: true } })
    : [];

  const analytics = computeArtworkAnalytics(artworks, rows);

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">My Analytics</h1>
      {!artworks.length ? <p className="text-sm text-muted-foreground">No artworks yet. Add your first artwork to start collecting analytics.</p> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Total artworks</p><p className="text-2xl font-semibold">{analytics.totals.artworksTotal}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Published artworks</p><p className="text-2xl font-semibold">{analytics.totals.artworksPublished}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Views (7d)</p><p className="text-2xl font-semibold">{analytics.views.last7}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Views (30d)</p><p className="text-2xl font-semibold">{analytics.views.last30}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Views (90d)</p><p className="text-2xl font-semibold">{analytics.views.last90}</p></div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Views trend (last 30 days)</h2>
        <div className="max-h-80 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="p-2 text-left">Day</th><th className="p-2 text-right">Views</th></tr></thead>
            <tbody>
              {analytics.views.daily30.map((row) => <tr key={row.day} className="border-b"><td className="p-2">{row.day}</td><td className="p-2 text-right">{row.views}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Top artworks (last 30 days)</h2>
        {analytics.views.top30.length === 0 ? <p className="text-sm text-muted-foreground">No views recorded in the last 30 days yet.</p> : (
          <ul className="space-y-2">
            {analytics.views.top30.map((item) => <li key={item.artworkId} className="rounded border p-3"><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.views} views</p><Link className="text-sm underline" href={`/artwork/${item.slug ?? item.artworkId}`}>View public page</Link></li>)}
          </ul>
        )}
      </section>

      <RegistrationsAnalyticsSection />
    </main>
  );
}
