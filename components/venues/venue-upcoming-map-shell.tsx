"use client";

import dynamic from "next/dynamic";

export type VenueUpcomingMapShellProps = {
  lat: number;
  lng: number;
  venueId: string;
  venueSlug: string;
  venueName: string;
  city: string | null;
};

const VenueUpcomingMap = dynamic(
  () => import("@/components/venues/venue-upcoming-map").then((mod) => mod.VenueUpcomingMap),
  { ssr: false },
);

export function VenueUpcomingMapShell(props: VenueUpcomingMapShellProps) {
  return <VenueUpcomingMap {...props} />;
}
