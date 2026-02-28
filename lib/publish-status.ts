import type { Prisma } from "@prisma/client";

export const PUBLISHED_STATUS = "PUBLISHED" as const;

export function publishedVenueWhere(): Prisma.VenueWhereInput {
  return {
    OR: [
      { status: PUBLISHED_STATUS },
      { isPublished: true },
    ],
  };
}

export function publishedEventWhere(): Prisma.EventWhereInput {
  return {
    OR: [
      { status: PUBLISHED_STATUS },
      { isPublished: true },
    ],
  };
}
