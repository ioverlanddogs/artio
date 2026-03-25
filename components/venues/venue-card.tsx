import Link from "next/link";
import Image from "next/image";

export type VenueCardItem = {
  slug: string;
  name: string;
  city?: string | null;
  primaryImageUrl?: string | null;
  distanceKm?: number | null;
};

export function VenueCard({ venue }: { venue: VenueCardItem }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="overflow-hidden rounded-lg border bg-card">
      {venue.primaryImageUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={venue.primaryImageUrl}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw,
             (max-width: 1024px) 50vw,
             33vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 font-medium">{venue.name}</p>
        {venue.city ? <p className="text-sm text-muted-foreground">{venue.city}</p> : null}
        {typeof venue.distanceKm === "number" ? <p className="text-xs text-muted-foreground">{venue.distanceKm.toFixed(1)} km</p> : null}
      </div>
    </Link>
  );
}
