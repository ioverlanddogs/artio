import AdminPageHeader from "../_components/AdminPageHeader";
import { db } from "@/lib/db";
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

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Venue AI Generation" description="Generate unpublished, claimable venue records by region." />
      <VenueGenerationClient initialRuns={runs} />
    </main>
  );
}
