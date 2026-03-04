export type SeriesRailEvent = {
  id: string;
  slug: string;
  title: string;
  startAt: Date;
  venue: { name: string | null } | null;
  images: Array<{ asset: { url: string } | null; alt: string | null }>;
};

export async function listPublishedEventsInSeriesWithDeps(
  deps: { findMany: (args: {
    where: { seriesId: string; isPublished: true; deletedAt: null; id: { not: string } };
    include: { venue: { select: { name: true } }; images: { take: number; orderBy: { sortOrder: "asc" }; include: { asset: { select: { url: true } } } } };
    orderBy: { startAt: "asc" };
    take: number;
  }) => Promise<SeriesRailEvent[]> },
  input: { seriesId: string; excludeEventId: string; limit?: number },
) {
  return deps.findMany({
    where: { seriesId: input.seriesId, isPublished: true, deletedAt: null, id: { not: input.excludeEventId } },
    include: { venue: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" }, include: { asset: { select: { url: true } } } } },
    orderBy: { startAt: "asc" },
    take: input.limit ?? 8,
  });
}
