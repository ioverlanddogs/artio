import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [digestOpens7d, digestClicks7d, recentClickEvents] = await Promise.all([
      db.engagementEvent.count({ where: { userId: user.id, surface: "DIGEST", action: "VIEW", targetType: "DIGEST_RUN", createdAt: { gte: since } } }),
      db.engagementEvent.count({ where: { userId: user.id, surface: "DIGEST", action: "CLICK", targetType: "EVENT", createdAt: { gte: since } } }),
      db.engagementEvent.findMany({
        where: { userId: user.id, action: "CLICK", targetType: "EVENT", createdAt: { gte: since } },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const clickedEventIds = Array.from(new Set(recentClickEvents.map((item) => item.targetId)));
    const clickedEvents = clickedEventIds.length
      ? await db.event.findMany({
        where: { id: { in: clickedEventIds } },
        select: { venue: { select: { id: true, name: true } }, eventTags: { include: { tag: { select: { slug: true, name: true } } } } },
      })
      : [];

    const venueCounts = new Map<string, { id: string; name: string; count: number }>();
    const tagCounts = new Map<string, { slug: string; name: string; count: number }>();

    for (const event of clickedEvents) {
      if (event.venue) {
        const current = venueCounts.get(event.venue.id) ?? { id: event.venue.id, name: event.venue.name, count: 0 };
        current.count += 1;
        venueCounts.set(event.venue.id, current);
      }
      for (const eventTag of event.eventTags) {
        const current = tagCounts.get(eventTag.tag.slug) ?? { slug: eventTag.tag.slug, name: eventTag.tag.name, count: 0 };
        current.count += 1;
        tagCounts.set(eventTag.tag.slug, current);
      }
    }

    return NextResponse.json({
      digestOpens7d,
      digestClicks7d,
      topTags7d: Array.from(tagCounts.values()).sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)).slice(0, 5),
      topVenues7d: Array.from(venueCounts.values()).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, 5),
    });
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
