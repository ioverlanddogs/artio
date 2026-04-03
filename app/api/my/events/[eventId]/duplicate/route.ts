import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireAuth, isAuthError } from "@/lib/auth";
import { eventIdParamSchema, zodDetails } from "@/lib/validators";
import { ensureUniqueEventSlugWithDeps, slugifyEventTitle } from "@/lib/event-slug";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireAuth();

    const parsedId = eventIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const sourceEvent = await db.event.findFirst({
      where: {
        id: parsedId.data.eventId,
        OR: [
          { submissions: { some: { submitterUserId: user.id, type: "EVENT", OR: [{ kind: "PUBLISH" }, { kind: null }] } } },
          { venue: { memberships: { some: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } } } } },
        ],
      },
      select: {
        title: true,
        venueId: true,
        description: true,
        eventType: true,
        ticketUrl: true,
        priceText: true,
        isFree: true,
      },
    });

    if (!sourceEvent) return apiError(403, "forbidden", "Event owner required");

    const slug = await ensureUniqueEventSlugWithDeps(
      { findBySlug: (candidate) => db.event.findUnique({ where: { slug: candidate }, select: { id: true } }) },
      slugifyEventTitle(`Copy of ${sourceEvent.title}`),
    );

    const newEvent = await db.event.create({
      data: {
        title: `Copy of ${sourceEvent.title}`,
        slug,
        venueId: sourceEvent.venueId,
        description: sourceEvent.description,
        eventType: sourceEvent.eventType,
        ticketUrl: sourceEvent.ticketUrl,
        priceText: sourceEvent.priceText,
        isFree: sourceEvent.isFree,
        startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endAt: null,
        isPublished: false,
        status: "DRAFT",
        timezone: "UTC",
        submittedAt: null,
        reviewedAt: null,
        reviewNotes: null,
        publishedAt: null,
      } as never,
      select: { id: true },
    });

    return NextResponse.json({ eventId: newEvent.id });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
