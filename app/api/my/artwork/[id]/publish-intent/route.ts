import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { buildInAppFromTemplate, enqueueNotification } from "@/lib/notifications";
import { submissionSubmittedDedupeKey } from "@/lib/notification-keys";
import { canSelfPublish, isAuthError, requireAuth } from "@/lib/auth";
import { requireMyArtworkAccess } from "@/lib/my-artwork-access";
import { evaluateArtworkReadiness } from "@/lib/publish-readiness";
import { idParamSchema, zodDetails } from "@/lib/validators";
import { toPublishBlockingIssues, type PublishIntentResponse } from "@/lib/publish-intent";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsedId = idParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  try {
    await requireMyArtworkAccess(parsedId.data.id);
    const user = await requireAuth();

    const artwork = await db.artwork.findUnique({
      where: { id: parsedId.data.id },
      select: { id: true, slug: true, title: true, medium: true, year: true, featuredAssetId: true, isPublished: true, deletedAt: true, images: { select: { id: true, assetId: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
    if (!artwork) return apiError(404, "not_found", "Artwork not found");

    if (artwork.deletedAt) {
      return NextResponse.json({ outcome: "blocked", status: "ARCHIVED", message: "This artwork is archived. Restore it before publishing." } satisfies PublishIntentResponse, { status: 409 });
    }

    if (artwork.isPublished) {
      return NextResponse.json({ outcome: "published", status: "PUBLISHED", message: "This artwork is already live.", publicUrl: `/artwork/${artwork.slug ?? artwork.id}` } satisfies PublishIntentResponse);
    }

    const readiness = evaluateArtworkReadiness(artwork, artwork.images);
    if (!readiness.ready) {
      return NextResponse.json({ outcome: "blocked", status: "DRAFT", message: "Please complete the required artwork details before publishing.", blockingIssues: toPublishBlockingIssues(readiness.blocking) } satisfies PublishIntentResponse, { status: 400 });
    }

    if (canSelfPublish(user)) {
      const featuredAssetId = artwork.featuredAssetId ?? artwork.images[0]?.assetId ?? undefined;
      await db.artwork.update({ where: { id: artwork.id }, data: { isPublished: true, ...(featuredAssetId ? { featuredAssetId } : {}) } });

      return NextResponse.json({ outcome: "published", status: "PUBLISHED", message: "Artwork published successfully.", publicUrl: `/artwork/${artwork.slug ?? artwork.id}` } satisfies PublishIntentResponse);
    }

    const latest = await db.submission.findFirst({
      where: { note: `artworkId:${artwork.id}`, type: "ARTWORK" },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (latest?.status === "IN_REVIEW") {
      return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "This artwork is already under review." } satisfies PublishIntentResponse);
    }

    const featuredAssetId = artwork.featuredAssetId ?? artwork.images[0]?.assetId ?? undefined;
    if (featuredAssetId) {
      await db.artwork.update({ where: { id: artwork.id }, data: { featuredAssetId } });
    }

    const submission = await db.submission.create({
      data: {
        type: "ARTWORK",
        status: "IN_REVIEW",
        submitterUserId: user.id,
        note: `artworkId:${artwork.id}`,
        submittedAt: new Date(),
      },
    });

    await enqueueNotification({
      type: "SUBMISSION_SUBMITTED",
      toEmail: user.email,
      dedupeKey: submissionSubmittedDedupeKey(submission.id),
      payload: {
        submissionId: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      },
      inApp: buildInAppFromTemplate(user.id, "SUBMISSION_SUBMITTED", {
        type: "SUBMISSION_SUBMITTED",
        submissionId: submission.id,
        submissionType: "ARTWORK",
      }),
    });

    return NextResponse.json({ outcome: "submitted", status: "IN_REVIEW", message: "Submitted for review. We'll notify you once a reviewer decides." } satisfies PublishIntentResponse);
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && (error.message === "forbidden" || error.message === "not_found")) return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
