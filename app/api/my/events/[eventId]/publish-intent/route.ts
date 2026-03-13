import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canSelfPublish, isAuthError, requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { buildInAppFromTemplate, enqueueNotification } from "@/lib/notifications";
import { submissionSubmittedDedupeKey } from "@/lib/notification-keys";
import { eventIdParamSchema, zodDetails } from "@/lib/validators";
import { evaluateEventReadiness } from "@/lib/publish-readiness";
import { toPublishBlockingIssues, type PublishIntentResponse } from "@/lib/publish-intent";
import { notifyGoogleIndexing } from "@/lib/google-event-indexing";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const parsedId = eventIdParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  try {
    const user = await requireAuth();
    const event = await db.event.findFirst({
      where: {
        id: parsedId.data.eventId,
        OR: [
          { submissions: { some: { submitterUserId: user.id, type: "EVENT", OR: [{ kind: "PUBLISH" }, { kind: null }] } } },
          { venue: { memberships: { some: { userId: user.id, role: { in: ["OWNER", "EDITOR"] } } } } },
        ],
      },
      select: { id: true, title: true, slug: true, status: true, isPublished: true, deletedAt: true, startAt: true, endAt: true, timezone: true, venueId: true, ticketUrl: true, venue: { select: { status: true, isPublished: true } } },
    });

    if (!event) return apiError(403, "forbidden", "Submission owner required");

    if (event.deletedAt || event.status === "ARCHIVED") {
      const res: PublishIntentResponse = { outcome: "blocked", status: "ARCHIVED", message: "This event is archived. Restore it before publishing." };
      return NextResponse.json(res, { status: 409 });
    }

    if (event.status === "IN_REVIEW") {
      return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "This event is under review. We'll notify you when review is complete." } satisfies PublishIntentResponse);
    }

    if (event.status === "APPROVED") {
      return NextResponse.json({
        outcome: "published",
        status: "APPROVED",
        message: "This event has been approved and is live.",
        publicUrl: event.slug ? `/events/${event.slug}` : undefined,
      } satisfies PublishIntentResponse);
    }

    if (event.isPublished || event.status === "PUBLISHED") {
      return NextResponse.json({ outcome: "published", status: "PUBLISHED", message: "This event is already live.", publicUrl: event.slug ? `/events/${event.slug}` : undefined } satisfies PublishIntentResponse);
    }

    const readiness = evaluateEventReadiness(event, event.venueId ? { id: event.venueId } : null);
    if (!readiness.ready) {
      const blockingIssues = toPublishBlockingIssues(readiness.blocking);
      return NextResponse.json({ outcome: "blocked", status: event.status, message: "Please complete the required fields before publishing.", blockingIssues } satisfies PublishIntentResponse, { status: 400 });
    }

    if (canSelfPublish(user)) {
      const updated = await db.event.update({ where: { id: event.id }, data: { isPublished: true, status: "PUBLISHED", publishedAt: new Date(), deletedAt: null, deletedByAdminId: null, deletedReason: null }, select: { status: true, slug: true } });
      if (updated.slug) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        await notifyGoogleIndexing(`${appUrl}/events/${updated.slug}`, "URL_UPDATED");
      }
      return NextResponse.json({ outcome: "published", status: updated.status, message: "Event published successfully.", publicUrl: updated.slug ? `/events/${updated.slug}` : undefined } satisfies PublishIntentResponse);
    }

    const created = await db.submission.create({ data: { type: "EVENT", kind: "PUBLISH", status: "IN_REVIEW", submitterUserId: user.id, venueId: event.venueId, targetEventId: event.id, submittedAt: new Date(), decisionReason: null, decidedAt: null, decidedByUserId: null } });
    await db.event.update({ where: { id: event.id }, data: { status: "IN_REVIEW", submittedAt: new Date() } });

    await enqueueNotification({ type: "SUBMISSION_SUBMITTED", toEmail: user.email, dedupeKey: submissionSubmittedDedupeKey(created.id), payload: { submissionId: created.id, status: created.status, submittedAt: created.submittedAt?.toISOString() ?? null }, inApp: buildInAppFromTemplate(user.id, "SUBMISSION_SUBMITTED", { type: "SUBMISSION_SUBMITTED", submissionId: created.id, submissionType: "EVENT" }) });

    return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "Submitted for review. We'll notify you once a reviewer decides." } satisfies PublishIntentResponse);
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
