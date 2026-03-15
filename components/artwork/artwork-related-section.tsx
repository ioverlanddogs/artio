import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { getArtworkPublicHref, type PublishedArtworkListItem } from "@/lib/artworks";

type Props = {
  title: string;
  subtitle?: string;
  items: PublishedArtworkListItem[];
  viewAllHref?: string;
  showArtistName?: boolean;
};

export function ArtworkRelatedSection({ title, subtitle, items, viewAllHref, showArtistName = false }: Props) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title={title} subtitle={subtitle} actions={viewAllHref ? <Link href={viewAllHref} className="text-sm underline">View all</Link> : undefined} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={getArtworkPublicHref(item)} className="rounded border p-2 hover:bg-muted/40">
            <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded bg-muted">
              {item.coverUrl ? <Image src={item.coverUrl} alt={item.title} fill className="object-contain" /> : null}
            </div>
            <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
            {showArtistName ? <p className="line-clamp-1 text-xs text-muted-foreground">{item.artist.name}</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
