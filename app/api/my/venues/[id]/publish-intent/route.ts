import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canSelfPublish, isAuthError, requireAuth, requireVenueRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { venueIdParamSchema, zodDetails } from "@/lib/validators";
import { evaluateVenueReadiness } from "@/lib/publish-readiness";
import { submissionSubmittedDedupeKey } from "@/lib/notification-keys";
import { buildInAppFromTemplate, enqueueNotification } from "@/lib/notifications";
import { toPublishBlockingIssues, type PublishIntentResponse } from "@/lib/publish-intent";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsedId = venueIdParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  try {
    const user = await requireAuth();
    await requireVenueRole(parsedId.data.id, "EDITOR");

    const venue = await db.venue.findUnique({
      where: { id: parsedId.data.id },
      select: { id: true, slug: true, status: true, isPublished: true, deletedAt: true, name: true, description: true, featuredAssetId: true, city: true, country: true, websiteUrl: true, images: { select: { id: true }, take: 1 } },
    });
    if (!venue) return apiError(404, "not_found", "Venue not found");

    if (venue.deletedAt || venue.status === "ARCHIVED") {
      return NextResponse.json({ outcome: "blocked", status: "ARCHIVED", message: "This venue is archived. Restore it before publishing." } satisfies PublishIntentResponse, { status: 409 });
    }

    if (venue.status === "IN_REVIEW") {
      return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "This venue is under review. We'll notify you when review is complete." } satisfies PublishIntentResponse);
    }

    if (venue.isPublished || venue.status === "PUBLISHED") {
      return NextResponse.json({ outcome: "published", status: "PUBLISHED", message: "This venue is already live.", publicUrl: venue.slug ? `/venues/${venue.slug}` : undefined } satisfies PublishIntentResponse);
    }

    const readiness = evaluateVenueReadiness(venue);
    if (!readiness.ready) {
      return NextResponse.json({ outcome: "blocked", status: venue.status, message: "Please complete the required venue details before publishing.", blockingIssues: toPublishBlockingIssues(readiness.blocking) } satisfies PublishIntentResponse, { status: 400 });
    }

    if (canSelfPublish(user)) {
      const updated = await db.venue.update({ where: { id: venue.id }, data: { isPublished: true, status: "PUBLISHED", deletedAt: null, deletedByAdminId: null, deletedReason: null }, select: { status: true, slug: true } });
      return NextResponse.json({ outcome: "published", status: updated.status, message: "Venue published successfully.", publicUrl: updated.slug ? `/venues/${updated.slug}` : undefined } satisfies PublishIntentResponse);
    }

    const latest = await db.submission.findFirst({ where: { targetVenueId: venue.id, type: "VENUE", kind: "PUBLISH" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { status: true } });
    if (latest?.status === "IN_REVIEW") {
      return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "This venue is already under review." } satisfies PublishIntentResponse);
    }

    const submission = await db.submission.create({ data: { type: "VENUE", kind: "PUBLISH", status: "IN_REVIEW", submitterUserId: user.id, venueId: venue.id, targetVenueId: venue.id, submittedAt: new Date(), decisionReason: null, decidedAt: null, decidedByUserId: null } });
    await db.venue.update({ where: { id: venue.id }, data: { isPublished: false, status: "IN_REVIEW" } });
    await enqueueNotification({ type: "SUBMISSION_SUBMITTED", toEmail: user.email, dedupeKey: submissionSubmittedDedupeKey(submission.id), payload: { submissionId: submission.id, status: submission.status, submittedAt: submission.submittedAt?.toISOString() ?? null }, inApp: buildInAppFromTemplate(user.id, "SUBMISSION_SUBMITTED", { type: "SUBMISSION_SUBMITTED", submissionId: submission.id, submissionType: "VENUE", targetVenueId: venue.id }) });

    return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "Submitted for review. We'll notify you once a reviewer decides." } satisfies PublishIntentResponse);
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Venue membership required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
