import { CampaignAudience, ContentStatus, PrismaClient, VenueMembershipRole } from "@prisma/client";

type AudienceFilter = {
  emails?: string[];
  city?: string;
  role?: "VENUE_OWNER" | "ARTIST" | "USER";
  createdBefore?: string;
  createdAfter?: string;
};

function normalizeEmails(emails: Array<string | null | undefined>): string[] {
  return [...new Set(emails.map((email) => email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))];
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function resolveAudience(
  db: PrismaClient,
  audienceType: CampaignAudience,
  filter?: Record<string, unknown>,
): Promise<string[]> {
  const parsedFilter = (filter ?? {}) as AudienceFilter;
  const unsubscribed = await db.emailUnsubscribe.findMany({ select: { email: true } });
  const unsubscribedSet = new Set(unsubscribed.map((entry) => entry.email.toLowerCase()));

  const withoutUnsubscribed = (emails: Array<string | null | undefined>) =>
    normalizeEmails(emails).filter((email) => !unsubscribedSet.has(email));

  switch (audienceType) {
    case "ALL_USERS": {
      const users = await db.user.findMany({ select: { email: true } });
      return withoutUnsubscribed(users.map((user) => user.email));
    }

    case "VENUE_OWNERS": {
      const owners = await db.user.findMany({
        where: {
          venueMemberships: {
            some: {
              role: VenueMembershipRole.OWNER,
              venue: {
                deletedAt: null,
                OR: [{ status: ContentStatus.PUBLISHED }, { isPublished: true }],
              },
            },
          },
        },
        select: { email: true },
      });
      return withoutUnsubscribed(owners.map((owner) => owner.email));
    }

    case "ARTISTS": {
      const artists = await db.user.findMany({
        where: {
          artistProfile: {
            is: {
              deletedAt: null,
              OR: [{ status: ContentStatus.PUBLISHED }, { isPublished: true }],
            },
          },
        },
        select: { email: true },
      });
      return withoutUnsubscribed(artists.map((artist) => artist.email));
    }

    case "NEW_USERS_7D": {
      const users = await db.user.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { email: true },
      });
      return withoutUnsubscribed(users.map((user) => user.email));
    }

    case "CUSTOM": {
      const createdBefore = toDate(parsedFilter.createdBefore);
      const createdAfter = toDate(parsedFilter.createdAfter);

      if (Array.isArray(parsedFilter.emails) && parsedFilter.emails.length > 0) {
        return withoutUnsubscribed(parsedFilter.emails);
      }

      const users = await db.user.findMany({
        where: {
          ...(createdBefore || createdAfter
            ? {
                createdAt: {
                  ...(createdBefore ? { lte: createdBefore } : {}),
                  ...(createdAfter ? { gte: createdAfter } : {}),
                },
              }
            : {}),
          ...(parsedFilter.city
            ? {
                locationLabel: {
                  contains: parsedFilter.city,
                  mode: "insensitive",
                },
              }
            : {}),
          ...(parsedFilter.role === "VENUE_OWNER"
            ? {
                venueMemberships: {
                  some: {
                    role: VenueMembershipRole.OWNER,
                    venue: {
                      deletedAt: null,
                      OR: [{ status: ContentStatus.PUBLISHED }, { isPublished: true }],
                    },
                  },
                },
              }
            : {}),
          ...(parsedFilter.role === "ARTIST"
            ? {
                artistProfile: {
                  is: {
                    deletedAt: null,
                    OR: [{ status: ContentStatus.PUBLISHED }, { isPublished: true }],
                  },
                },
              }
            : {}),
        },
        select: { email: true },
      });

      return withoutUnsubscribed(users.map((user) => user.email));
    }

    default: {
      const exhaustiveAudienceType: never = audienceType;
      throw new Error(`Unknown audience type: ${exhaustiveAudienceType}`);
    }
  }
}
