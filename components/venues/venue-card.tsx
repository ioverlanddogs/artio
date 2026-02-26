import Link from "next/link";

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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.primaryImageUrl} alt={venue.name} className="h-40 w-full object-cover" />
      ) : null}
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 font-medium">{venue.name}</p>
        {venue.city ? <p className="text-sm text-muted-foreground">{venue.city}</p> : null}
        {typeof venue.distanceKm === "number" ? <p className="text-xs text-muted-foreground">{venue.distanceKm.toFixed(1)} km</p> : null}
      </div>
    </Link>
  );
}
