import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { eventIdParamSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

function startDayDaysAgo(daysAgo: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireAuth();

    const parsedId = eventIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const eventId = parsedId.data.eventId;
    const event = await db.event.findFirst({
      where: {
        id: eventId,
        OR: [
          { submissions: { some: { submitterUserId: user.id, type: "EVENT", OR: [{ kind: "PUBLISH" }, { kind: null }] } } },
          { venue: { memberships: { some: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } } } } },
        ],
      },
      select: { id: true },
    });

    if (!event) return apiError(403, "forbidden", "You do not have access to this event");

    const [totalViews, last7DaysViews, last30DaysViews, saves] = await Promise.all([
      db.pageViewEvent.count({ where: { entityType: "EVENT", entityId: eventId } }),
      db.pageViewEvent.count({ where: { entityType: "EVENT", entityId: eventId, occurredAt: { gte: startDayDaysAgo(6) } } }),
      db.pageViewEvent.count({ where: { entityType: "EVENT", entityId: eventId, occurredAt: { gte: startDayDaysAgo(29) } } }),
      db.favorite.count({ where: { targetType: "EVENT", targetId: eventId } }),
    ]);

    return Response.json({ totalViews, last7DaysViews, last30DaysViews, saves }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
