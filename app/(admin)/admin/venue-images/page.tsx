import AdminPageHeader from "../_components/AdminPageHeader";
import { db } from "@/lib/db";
import { VenueImagesClient, type VenueGroup } from "./venue-images-client";

export const dynamic = "force-dynamic";

export default async function AdminVenueImagesPage() {
  const candidates = await db.venueHomepageImageCandidate.findMany({
    where: { status: "pending" },
    orderBy: [{ venueId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      url: true,
      source: true,
      sortOrder: true,
      venueId: true,
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          featuredAssetId: true,
          status: true,
        },
      },
    },
  });

  const grouped = new Map<string, VenueGroup>();
  for (const candidate of candidates) {
    if (!grouped.has(candidate.venueId)) {
      grouped.set(candidate.venueId, {
        venueId: candidate.venue.id,
        venueName: candidate.venue.name,
        venueCity: candidate.venue.city,
        venueCountry: candidate.venue.country,
        featuredAssetId: candidate.venue.featuredAssetId,
        venueStatus: candidate.venue.status,
        candidates: [],
      });
    }

    grouped.get(candidate.venueId)?.candidates.push({
      id: candidate.id,
      url: candidate.url,
      source: candidate.source,
      sortOrder: candidate.sortOrder,
    });
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Homepage image candidates" />
      <VenueImagesClient groups={Array.from(grouped.values())} />
    </main>
  );
}
