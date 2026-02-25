import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrRefreshVenueInvite, normalizeInviteStatus } from "@/lib/invites";
import { inviteCreatedDedupeKey } from "@/lib/notification-keys";
import { buildInAppFromTemplate, enqueueNotification } from "@/lib/notifications";
import { buildNotification } from "@/lib/notification-templates";
import { requireVenueMemberManager } from "@/lib/venue-access";
import { parseBody, venueIdParamSchema, venueInviteCreateSchema, zodDetails } from "@/lib/validators";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, rateLimitErrorResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    await requireVenueMemberManager(parsedId.data.id);

    const invites = await db.venueInvite.findMany({
      where: { venueId: parsedId.data.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites.map((invite) => ({
      id: invite.id,
      venueId: invite.venueId,
      email: invite.email,
      role: invite.role,
      status: normalizeInviteStatus(invite),
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    })));
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Owner membership required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const user = await requireVenueMemberManager(parsedId.data.id);

    await enforceRateLimit({
      key: `invites:create:venue:${parsedId.data.id}:user:${user.id}`,
      limit: RATE_LIMITS.invitesCreate.limit,
      windowMs: RATE_LIMITS.invitesCreate.windowMs,
    });

    const parsedBody = venueInviteCreateSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const invite = await createOrRefreshVenueInvite({
      venueId: parsedId.data.id,
      email: parsedBody.data.email,
      role: parsedBody.data.role,
      invitedByUserId: user.id,
    });

    const invitedUser = await db.user.findUnique({
      where: { email: invite.email.toLowerCase() },
      select: { id: true },
    });

    const template = buildNotification({
      type: "INVITE_CREATED",
      payload: {
        type: "INVITE_CREATED",
        inviteId: invite.id,
        inviteToken: invite.token,
        venueId: invite.venueId,
        role: invite.role,
      },
    });

    await enqueueNotification({
      type: "INVITE_CREATED",
      toEmail: invite.email,
      dedupeKey: inviteCreatedDedupeKey(invite.id),
      payload: {
        inviteId: invite.id,
        venueId: invite.venueId,
        role: invite.role,
        invitePath: template.href,
        expiresAt: invite.expiresAt.toISOString(),
      },
      inApp: invitedUser ? buildInAppFromTemplate(invitedUser.id, "INVITE_CREATED", {
        type: "INVITE_CREATED",
        inviteId: invite.id,
        inviteToken: invite.token,
        venueId: invite.venueId,
        role: invite.role,
      }) : undefined,
    });

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      invitePath: template.href ?? `/invite/${invite.token}`,
    }, { status: 201 });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Owner membership required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
