import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { computeArtworkAnalytics, type ArtworkStat } from "@/lib/artwork-analytics";
import { RegistrationsAnalyticsSection } from "@/app/my/analytics/registrations-section";

type ArtworkBreakdownPayload = { artworks?: ArtworkStat[] };

function parseWindowDays(value: string | undefined): 7 | 30 {
  return value === "7" ? 7 : 30;
}

function formatArtworkPrice(item: ArtworkStat) {
  if (item.priceAmount === null || !item.currency) return "—";
  const amount = item.priceAmount / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: item.currency.toUpperCase() }).format(amount);
  } catch {
    return `${item.currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export default async function MyAnalyticsPage({ searchParams }: { searchParams?: Promise<{ windowDays?: string }> }) {
  const user = await getSessionUser();
  if (!user) return redirectToLogin("/my/analytics");

  const artist = await db.artist.findUnique({ where: { userId: user.id }, select: { id: true } });

  const params = searchParams ? await searchParams : undefined;
  const windowDays = parseWindowDays(params?.windowDays);

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : null;

  let artworks: Prisma.ArtworkGetPayload<{ select: { id: true; title: true; slug: true; isPublished: true } }>[] = [];
  let rows: Array<{ entityId: string; day: Date; views: number }> = [];
  let artworkStats: ArtworkStat[] = [];

  if (artist) {
    artworks = await db.artwork.findMany({
      where: { artistId: artist.id },
      select: { id: true, title: true, slug: true, isPublished: true },
    });

    const start90 = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 89));

    rows = artworks.length
      ? await db.pageViewDaily.findMany({
          where: {
            entityType: "ARTWORK",
            entityId: { in: artworks.map((item) => item.id) },
            day: { gte: start90 },
          },
          select: { entityId: true, day: true, views: true },
        })
      : [];

    if (origin) {
      const response = await fetch(`${origin}/api/my/analytics/artwork?windowDays=${windowDays}`, {
        cache: "no-store",
        headers: { cookie: headerStore.get("cookie") ?? "" },
      });
      if (response.ok) {
        const body: ArtworkBreakdownPayload = await response.json().catch(() => ({}));
        artworkStats = Array.isArray(body.artworks) ? body.artworks : [];
      }
    }
  }

  const analytics = computeArtworkAnalytics(artworks, rows);

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">My Analytics</h1>

      {artist ? (
        <>
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

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Artwork performance</h2>
              <div className="inline-flex rounded border p-1 text-xs">
                <Link className={`rounded px-2 py-1 ${windowDays === 7 ? "bg-muted font-medium" : "text-muted-foreground"}`} href="/my/analytics?windowDays=7">7d</Link>
                <Link className={`rounded px-2 py-1 ${windowDays === 30 ? "bg-muted font-medium" : "text-muted-foreground"}`} href="/my/analytics?windowDays=30">30d</Link>
              </div>
            </div>

            {artworkStats.length === 0 ? <p className="text-sm text-muted-foreground">No artwork engagement recorded for this period.</p> : (
              <div className="overflow-x-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="p-2">Artwork thumbnail</th>
                      <th className="p-2">Title</th>
                      <th className="p-2 text-right">Views</th>
                      <th className="p-2 text-right">Enquiries</th>
                      <th className="p-2 text-right">Sales</th>
                      <th className="p-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artworkStats.map((item) => (
                      <tr key={item.artworkId} className="border-b">
                        <td className="p-2">
                          {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} width={48} height={48} className="h-12 w-12 rounded object-cover" unoptimized /> : <div className="h-12 w-12 rounded bg-muted" />}
                        </td>
                        <td className="p-2"><Link className="underline" href={`/artwork/${item.slug ?? item.artworkId}`}>{item.title}</Link></td>
                        <td className="p-2 text-right">{item.views}</td>
                        <td className="p-2 text-right">{item.inquiries}</td>
                        <td className="p-2 text-right">{item.orders}</td>
                        <td className="p-2 text-right">{item.isSold ? "Sold" : formatArtworkPrice(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded border border-dashed p-6 text-sm text-muted-foreground">
          <p>Artwork analytics are available once you create an artist profile.</p>
          <a className="mt-2 inline-block underline" href="/my/artist">Set up artist profile</a>
        </div>
      )}

      <RegistrationsAnalyticsSection />
    </main>
  );
}
