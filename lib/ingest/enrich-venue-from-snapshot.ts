import type { Prisma, PrismaClient } from "@prisma/client";
import type { VenueSnapshot } from "@/lib/ingest/openai-extract";

function toNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isStringImprovement(current: string | null | undefined, incoming: string | null): incoming is string {
  if (!incoming) return false;
  const currentValue = toNonEmptyString(current);
  if (!currentValue) return true;
  return incoming.length > currentValue.length;
}

export async function enrichVenueFromSnapshot(args: {
  db: PrismaClient;
  venueId: string;
  runId: string;
  snapshot: VenueSnapshot;
}): Promise<{ enriched: boolean; changedFields: string[] }> {
  const venue = await args.db.venue.findUnique({
    where: { id: args.venueId },
    select: {
      id: true,
      description: true,
      openingHours: true,
      contactEmail: true,
      instagramUrl: true,
      facebookUrl: true,
      featuredAssetId: true,
    },
  });

  if (!venue) {
    return { enriched: false, changedFields: [] };
  }

  const changedFields: string[] = [];
  const before: Prisma.JsonObject = {};
  const after: Prisma.JsonObject = {};
  const venueUpdateData: Prisma.VenueUpdateInput = {
    lastEnrichedAt: new Date(),
    enrichmentSource: "ingest_snapshot",
  };

  const description = toNonEmptyString(args.snapshot.venueDescription);
  if (isStringImprovement(venue.description, description)) {
    changedFields.push("description");
    before.description = venue.description;
    after.description = description;
    venueUpdateData.description = description;
  }

  const openingHoursRaw = toNonEmptyString(args.snapshot.venueOpeningHours);
  const currentOpeningHoursRaw = (() => {
    if (!venue.openingHours || typeof venue.openingHours !== "object" || Array.isArray(venue.openingHours)) return null;
    const maybeRaw = (venue.openingHours as Record<string, unknown>).raw;
    return typeof maybeRaw === "string" ? maybeRaw : null;
  })();
  if (isStringImprovement(currentOpeningHoursRaw, openingHoursRaw)) {
    changedFields.push("openingHours");
    before.openingHours = venue.openingHours as Prisma.JsonValue;
    const nextOpeningHours = { raw: openingHoursRaw };
    after.openingHours = nextOpeningHours;
    venueUpdateData.openingHours = nextOpeningHours;
  }

  const contactEmail = toNonEmptyString(args.snapshot.venueContactEmail);
  if (isStringImprovement(venue.contactEmail, contactEmail)) {
    changedFields.push("contactEmail");
    before.contactEmail = venue.contactEmail;
    after.contactEmail = contactEmail;
    venueUpdateData.contactEmail = contactEmail;
  }

  const instagramUrl = toNonEmptyString(args.snapshot.venueInstagramUrl);
  if (isStringImprovement(venue.instagramUrl, instagramUrl)) {
    changedFields.push("instagramUrl");
    before.instagramUrl = venue.instagramUrl;
    after.instagramUrl = instagramUrl;
    venueUpdateData.instagramUrl = instagramUrl;
  }

  const facebookUrl = toNonEmptyString(args.snapshot.venueFacebookUrl);
  if (isStringImprovement(venue.facebookUrl, facebookUrl)) {
    changedFields.push("facebookUrl");
    before.facebookUrl = venue.facebookUrl;
    after.facebookUrl = facebookUrl;
    venueUpdateData.facebookUrl = facebookUrl;
  }

  if (changedFields.length === 0) {
    return { enriched: false, changedFields: [] };
  }

  await args.db.$transaction(async (tx) => {
    await tx.venue.update({
      where: { id: args.venueId },
      data: venueUpdateData,
    });

    await tx.venueEnrichmentLog.create({
      data: {
        venueId: args.venueId,
        runId: args.runId,
        changedFields,
        before,
        after,
      },
    });
  });

  if (!venue.featuredAssetId) {
    try {
      const candidate = await args.db.venueHomepageImageCandidate.findFirst({
        where: { venueId: args.venueId, status: "approved" },
        orderBy: { sortOrder: "asc" },
        select: { venueImageId: true },
      });

      if (candidate?.venueImageId) {
        await args.db.venue.update({
          where: { id: args.venueId },
          data: { featuredAssetId: candidate.venueImageId },
        });
      }
    } catch (error) {
      console.error("[venue-enrichment] featured asset sync failed", error);
    }
  }

  return { enriched: true, changedFields };
}
