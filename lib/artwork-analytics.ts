import type { AnalyticsEntityType } from "@prisma/client";
import { db } from "@/lib/db";

export type ArtworkAnalyticsInputArtwork = {
  id: string;
  title: string;
  slug: string | null;
  isPublished: boolean;
};

export type ArtworkAnalyticsInputDailyRow = {
  entityId: string;
  day: Date;
  views: number;
};

export type ArtworkAnalyticsResult = {
  totals: { artworksTotal: number; artworksPublished: number };
  views: {
    last7: number;
    last30: number;
    last90: number;
    daily30: Array<{ day: string; views: number }>;
    top30: Array<{ artworkId: string; title: string; slug: string | null; views: number }>;
  };
};

export type ArtworkStat = {
  artworkId: string;
  title: string;
  slug: string | null;
  imageUrl: string | null;
  views: number;
  inquiries: number;
  orders: number;
  priceAmount: number | null;
  currency: string | null;
  isSold: boolean;
};

function utcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(date: Date) {
  return utcDayStart(date).toISOString().slice(0, 10);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 86_400_000);
}

function buildZeroFilledDailySeries(days: number, now: Date) {
  const start = subtractDays(utcDayStart(now), days - 1);
  const entries: Array<{ day: string; views: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start.getTime() + i * 86_400_000);
    entries.push({ day: day.toISOString().slice(0, 10), views: 0 });
  }
  return entries;
}

export async function getArtworkBreakdown(artistId: string, windowDays: 7 | 30): Promise<ArtworkStat[]> {
  const since = new Date(Date.now() - (windowDays - 1) * 86_400_000);

  const artworks = await db.artwork.findMany({
    where: { artistId },
    select: {
      id: true,
      title: true,
      slug: true,
      priceAmount: true,
      currency: true,
      soldAt: true,
      featuredAsset: { select: { url: true } },
    },
  });

  if (!artworks.length) return [];

  const artworkIds = artworks.map((artwork) => artwork.id);

  const [viewRows, inquiryRows, orderRows] = await Promise.all([
    db.engagementEvent.groupBy({
      by: ["targetId"],
      where: {
        targetType: "ARTWORK",
        action: "VIEW",
        targetId: { in: artworkIds },
        createdAt: { gte: since },
      },
      _count: { _all: true },
      orderBy: { _count: { targetId: "desc" } },
      take: 20,
    }),
    db.artworkInquiry.groupBy({
      by: ["artworkId"],
      where: { artworkId: { in: artworkIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.artworkOrder.groupBy({
      by: ["artworkId"],
      where: { artworkId: { in: artworkIds }, status: "CONFIRMED", createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const inquiryCountByArtworkId = new Map(inquiryRows.map((row) => [row.artworkId, row._count._all]));
  const orderCountByArtworkId = new Map(orderRows.map((row) => [row.artworkId, row._count._all]));
  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));

  return viewRows
    .map((row) => {
      const artwork = artworkById.get(row.targetId);
      if (!artwork) return null;
      return {
        artworkId: artwork.id,
        title: artwork.title,
        slug: artwork.slug,
        imageUrl: artwork.featuredAsset?.url ?? null,
        views: row._count._all,
        inquiries: inquiryCountByArtworkId.get(artwork.id) ?? 0,
        orders: orderCountByArtworkId.get(artwork.id) ?? 0,
        priceAmount: artwork.priceAmount,
        currency: artwork.currency,
        isSold: artwork.soldAt !== null,
      } satisfies ArtworkStat;
    })
    .filter((item): item is ArtworkStat => item !== null)
    .sort((a, b) => {
      const viewDiff = b.views - a.views;
      if (viewDiff !== 0) return viewDiff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 20);
}

export function computeArtworkAnalytics(
  artworks: ArtworkAnalyticsInputArtwork[],
  dailyRows: ArtworkAnalyticsInputDailyRow[],
  now = new Date(),
): ArtworkAnalyticsResult {
  const totals = {
    artworksTotal: artworks.length,
    artworksPublished: artworks.filter((item) => item.isPublished).length,
  };

  const start7Key = dayKey(subtractDays(now, 6));
  const start30Key = dayKey(subtractDays(now, 29));
  const start90Key = dayKey(subtractDays(now, 89));

  let last7 = 0;
  let last30 = 0;
  let last90 = 0;

  const daily30ByDay = new Map(buildZeroFilledDailySeries(30, now).map((row) => [row.day, row.views]));
  const top30ByArtwork = new Map(artworks.map((item) => [item.id, 0]));

  for (const row of dailyRows) {
    const key = dayKey(row.day);
    if (key >= start90Key) last90 += row.views;
    if (key >= start30Key) {
      last30 += row.views;
      top30ByArtwork.set(row.entityId, (top30ByArtwork.get(row.entityId) ?? 0) + row.views);
      daily30ByDay.set(key, (daily30ByDay.get(key) ?? 0) + row.views);
    }
    if (key >= start7Key) last7 += row.views;
  }

  const artworkById = new Map(artworks.map((item) => [item.id, item]));
  const top30 = Array.from(top30ByArtwork.entries())
    .map(([artworkId, views]) => ({ artworkId, views, artwork: artworkById.get(artworkId) }))
    .filter((item) => item.artwork)
    .sort((a, b) => {
      const viewDiff = b.views - a.views;
      if (viewDiff !== 0) return viewDiff;
      const titleDiff = a.artwork!.title.localeCompare(b.artwork!.title);
      if (titleDiff !== 0) return titleDiff;
      return a.artworkId.localeCompare(b.artworkId);
    })
    .slice(0, 10)
    .map((item) => ({ artworkId: item.artworkId, views: item.views, title: item.artwork!.title, slug: item.artwork!.slug }));

  const daily30 = Array.from(daily30ByDay.entries()).map(([day, views]) => ({ day, views }));

  return { totals, views: { last7, last30, last90, daily30, top30 } };
}

export function isTrackableEntityType(value: string): value is AnalyticsEntityType {
  return value === "ARTWORK" || value === "ARTIST" || value === "VENUE" || value === "EVENT";
}

export function getUtcTodayDate() {
  return utcDayStart(new Date());
}
