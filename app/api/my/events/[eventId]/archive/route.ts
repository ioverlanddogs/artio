import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { eventIdParamSchema, zodDetails } from "@/lib/validators";
import { apiError } from "@/lib/api";
import { handleMyEntityArchive } from "@/lib/my-entity-archive-route";
import { notifyGoogleIndexing } from "@/lib/google-event-indexing";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const parsedId = eventIdParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  return handleMyEntityArchive(req, { id: parsedId.data.eventId }, {
    requireAuth,
    getEntityForUser: (id, userId) => db.event.findFirst({
      where: {
        id,
        OR: [
          { venue: { memberships: { some: { userId, role: { in: ["OWNER", "EDITOR"] } } } } },
          { submissions: { some: { submitterUserId: userId, type: "EVENT", OR: [{ kind: "PUBLISH" }, { kind: null }] } } },
        ],
      },
      select: { id: true, slug: true, deletedAt: true, deletedReason: true, deletedByAdminId: true, isPublished: true },
    }),
    updateEntity: (id, data) => db.event.update({ where: { id }, data, select: { id: true, slug: true, deletedAt: true, deletedReason: true, deletedByAdminId: true, isPublished: true } }),
    onArchived: async (item) => {
      const slug = (item as { slug?: string | null }).slug;
      if (!slug) return;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await notifyGoogleIndexing(`${appUrl}/events/${slug}`, "URL_DELETED");
    },
  });
}
