"use client";

import { trackEngagement } from "@/lib/engagement-client";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  venueName?: string | null;
  venueSlug?: string | null;
};

export function SearchResultsList({ items, query, nextCursor }: { items: SearchResult[]; query?: string; nextCursor?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loadMoreHref = (() => {
    if (!nextCursor) return null;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("cursor", nextCursor);
    return `${pathname}?${params.toString()}`;
  })();

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id} onClick={() => trackEngagement({ surface: "SEARCH", action: "CLICK", targetType: "EVENT", targetId: item.id, meta: { position: index, query: query?.slice(0, 120) } })}>
            <EventCard
              href={`/events/${item.slug}`}
              title={item.title}
              startAt={item.startAt}
              endAt={item.endAt}
              venueName={item.venueName}
              venueSlug={item.venueSlug}
            />
          </li>
        ))}
      </ul>
      {loadMoreHref ? (
        <Link href={loadMoreHref} className="inline-flex rounded border px-3 py-2 text-sm hover:bg-muted">
          Load more
        </Link>
      ) : null}
    </div>
  );
}
