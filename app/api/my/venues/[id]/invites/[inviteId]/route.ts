import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireVenueMemberManager } from "@/lib/venue-access";
import { inviteIdParamSchema, venueIdParamSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  try {
    const parsedParams = await params;
    const parsedVenueId = venueIdParamSchema.safeParse({ id: parsedParams.id });
    if (!parsedVenueId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedVenueId.error));
    const parsedInviteId = inviteIdParamSchema.safeParse({ inviteId: parsedParams.inviteId });
    if (!parsedInviteId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedInviteId.error));

    await requireVenueMemberManager(parsedVenueId.data.id);

    const invite = await db.venueInvite.findUnique({
      where: { id: parsedInviteId.data.inviteId },
      select: { id: true, venueId: true, status: true },
    });

    if (!invite || invite.venueId !== parsedVenueId.data.id) return apiError(404, "not_found", "Invite not found");

    if (invite.status === "PENDING") {
      await db.venueInvite.update({ where: { id: invite.id }, data: { status: "REVOKED" } });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    if (error instanceof Error && error.message === "forbidden") {
      return apiError(403, "forbidden", "Owner membership required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
