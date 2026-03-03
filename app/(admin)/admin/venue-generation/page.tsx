import AdminPageHeader from "../_components/AdminPageHeader";
import { db } from "@/lib/db";
import { VenueGenerationClient } from "./venue-generation-client";

export const runtime = "nodejs";

export default async function AdminVenueGenerationPage() {
  const runs = await db.venueGenerationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      country: true,
      region: true,
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
        take: 200,
        select: {
          id: true,
          name: true,
          city: true,
          postcode: true,
          country: true,
          status: true,
          reason: true,
          venueId: true,
          geocodeStatus: true,
          geocodeErrorCode: true,
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
