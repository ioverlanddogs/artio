import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getArtworkPublicHref, type TrendingArtworkListItem } from "@/lib/artworks";

export function TrendingRail({ items }: { items: TrendingArtworkListItem[] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="type-h3">Trending (30 days)</h2>
          <p className="type-caption">Most viewed artworks in the last month</p>
        </div>
        <Link className="text-sm underline underline-offset-4" href="/artwork?sort=VIEWS_30D_DESC">
          View all
        </Link>
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
        {items.map((item) => (
          <Link
            key={item.id}
            href={getArtworkPublicHref(item)}
            className="w-[74%] shrink-0 snap-start rounded border bg-card p-3 transition hover:bg-muted/40 md:w-auto"
          >
            <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded bg-muted">
              {item.coverUrl ? <Image src={item.coverUrl} alt={item.title} fill className="object-contain" /> : null}
            </div>
            <div className="line-clamp-1 font-medium">{item.title}</div>
            <div className="line-clamp-1 text-sm text-muted-foreground">{item.artist.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.views30} views (30d)</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
