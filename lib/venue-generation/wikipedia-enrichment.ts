export type WikipediaEnrichmentResult = {
  found: boolean;
  pageId: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  description: string | null;
  imageUrl: string | null;
};

export async function lookupVenueOnWikipedia(args: {
  name: string;
  city: string | null;
  fetchImpl?: typeof fetch;
}): Promise<WikipediaEnrichmentResult> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const empty: WikipediaEnrichmentResult = {
    found: false,
    pageId: null,
    pageTitle: null,
    pageUrl: null,
    description: null,
    imageUrl: null,
  };

  const searchQuery = [args.name, args.city].filter(Boolean).join(" ");
  if (!searchQuery.trim()) return empty;

  try {
    const searchRes = await fetchImpl(
      `https://en.wikipedia.org/w/api.php?action=query&list=search` +
        `&srsearch=${encodeURIComponent(searchQuery)}` +
        `&srlimit=1&format=json&origin=*`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!searchRes.ok) return empty;

    type SearchResponse = {
      query?: { search?: Array<{ title: string; pageid: number }> };
    };
    const searchData = (await searchRes.json()) as SearchResponse;
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return empty;

    const pageTitle = firstResult.title;
    const pageId = String(firstResult.pageid);

    const detailRes = await fetchImpl(
      `https://en.wikipedia.org/w/api.php?action=query` +
        `&prop=extracts|pageimages` +
        `&exintro=true&explaintext=true&piprop=original` +
        `&titles=${encodeURIComponent(pageTitle)}` +
        `&format=json&origin=*`,
      { signal: AbortSignal.timeout(8_000) },
    );

    if (!detailRes.ok) {
      return {
        found: true,
        pageId,
        pageTitle,
        pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
        description: null,
        imageUrl: null,
      };
    }

    type DetailResponse = {
      query?: {
        pages?: Record<
          string,
          {
            extract?: string;
            original?: { source?: string };
          }
        >;
      };
    };
    const detailData = (await detailRes.json()) as DetailResponse;
    const page = Object.values(detailData.query?.pages ?? {})[0];

    const rawExtract = page?.extract ?? null;
    const description = rawExtract
      ? rawExtract.split("\n")[0]?.slice(0, 500) ?? null
      : null;

    const imageUrl = page?.original?.source ?? null;

    return {
      found: true,
      pageId,
      pageTitle,
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      description: description || null,
      imageUrl: imageUrl || null,
    };
  } catch {
    return empty;
  }
}
