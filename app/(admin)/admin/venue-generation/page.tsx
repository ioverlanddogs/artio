import AdminPageHeader from "../_components/AdminPageHeader";
import { db } from "@/lib/db";
import { computeVenuePublishBlockers } from "@/lib/publish-blockers";
import { VenueGenerationClient } from "./venue-generation-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminVenueGenerationPage() {
  const runs = await db.venueGenerationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      country: true,
      region: true,
      status: true,
      totalReturned: true,
      totalCreated: true,
      totalSkipped: true,
      totalFailed: true,
      geocodeAttempted: true,
      geocodeSucceeded: true,
      geocodeFailed: true,
      geocodeFailureBreakdown: true,
      autoPublishedCount: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        take: 50, // Reduced from 200 — full item list available via /api/admin/venue-generation/runs
        select: {
          id: true,
          name: true,
          city: true,
          postcode: true,
          country: true,
          status: true,
          reason: true,
          venueId: true,
          instagramUrl: true,
          facebookUrl: true,
          contactEmail: true,
          socialWarning: true,
          homepageImageStatus: true,
          homepageImageCandidateCount: true,
          geocodeStatus: true,
          geocodeErrorCode: true,
          timezoneWarning: true,
          createdAt: true,
        },
      },
    },
  });

  const createdVenueIds = [
    ...new Set(
      runs
        .flatMap((run) => run.items)
        .filter((item) => item.status === "created" && item.venueId)
        .map((item) => item.venueId as string),
    ),
  ];

  const venues = createdVenueIds.length > 0
    ? await db.venue.findMany({
        where: { id: { in: createdVenueIds } },
        select: { id: true, name: true, city: true, country: true, lat: true, lng: true, status: true },
      })
    : [];

  const venueMap = new Map(venues.map((venue) => [venue.id, venue]));

  const runsWithPublishReadiness = runs.map((run) => ({
    ...run,
    items: run.items.map((item) => {
      const venue = item.venueId ? venueMap.get(item.venueId) : null;
      const blockers = item.status === "created" && item.venueId
        ? computeVenuePublishBlockers(venue ?? { name: null, city: null, country: null, lat: null, lng: null }).map((blocker) => blocker.message)
        : [];
      const publishable = item.status === "created" && item.venueId
        ? blockers.length === 0 && venue?.status !== "PUBLISHED"
        : false;

      return {
        ...item,
        publishable,
        blockers,
        venueStatus: venue?.status ?? null,
      };
    }),
  }));

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Venue AI Generation" description="Generate unpublished, claimable venue records by region." />
      <VenueGenerationClient initialRuns={runsWithPublishReadiness} />
    </main>
  );
}
