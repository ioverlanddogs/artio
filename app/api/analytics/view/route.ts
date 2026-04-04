import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleTrackPageView } from "@/lib/page-view-route";
import { trackUserInteraction } from "@/domains/recommendation/interaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getCachedAnalyticsSalt = unstable_cache(
  async () => {
    const settings = await db.siteSettings.findUnique({ where: { id: "default" }, select: { analyticsSalt: true } });
    return settings?.analyticsSalt;
  },
  ["site-settings", "analytics-salt"],
  { revalidate: 30 },
);

export async function POST(req: NextRequest) {
  return handleTrackPageView(req, {
    getSessionUser,
    getAnalyticsSalt: getCachedAnalyticsSalt,
    createEvent: async (input) => {
      await db.pageViewEvent.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          day: input.day,
          viewerHash: input.viewerHash,
          userId: input.userId,
        },
      });
      if (input.userId) {
        await trackUserInteraction(db, {
          userId: input.userId,
          type: "VIEW",
          entityType: input.entityType,
          entityId: input.entityId,
        });
      }
    },
    incrementDaily: async (input) => {
      await db.$executeRaw(
        Prisma.sql`INSERT INTO "PageViewDaily" ("id", "entityType", "entityId", "day", "views")
                   VALUES (gen_random_uuid(), ${input.entityType}::"AnalyticsEntityType", ${input.entityId}::uuid, ${input.day}::date, 1)
                   ON CONFLICT ("entityType", "entityId", "day")
                   DO UPDATE SET "views" = "PageViewDaily"."views" + 1`,
      );
    },
  });
}
