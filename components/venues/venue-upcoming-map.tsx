"use client";

import { NearbyMap } from "@/components/nearby/nearby-map";
import type { NearbyMapItem } from "@/lib/nearby-map";

type VenueUpcomingMapProps = {
  lat: number;
  lng: number;
  venueId: string;
  venueSlug: string;
  venueName: string;
  city: string | null;
};

export function VenueUpcomingMap({ lat, lng, venueId, venueSlug, venueName, city }: VenueUpcomingMapProps) {
  const items: NearbyMapItem[] = [{
    id: venueId,
    slug: venueSlug,
    name: venueName,
    city,
    lat,
    lng,
    kind: "venue",
  }];

  return (
    <NearbyMap
      items={items}
      lat={String(lat)}
      lng={String(lng)}
      radiusKm="1"
      days={7}
      onSearchArea={async () => {}}
    />
  );
}
