import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { tokenParamSchema, zodDetails } from "@/lib/validators";
import { acceptInviteWithDeps } from "@/lib/invite-accept.service";
import { setOnboardingFlagForSession } from "@/lib/onboarding";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const user = await requireAuth();
    const parsedToken = tokenParamSchema.safeParse(await params);
    if (!parsedToken.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedToken.error));

    const result = await acceptInviteWithDeps(
      {
        findInviteByToken: (token) => db.venueInvite.findUnique({ where: { token } }),
        markInviteExpired: async (inviteId) => {
          await db.venueInvite.update({ where: { id: inviteId }, data: { status: "EXPIRED" } });
        },
        upsertMembership: (input) =>
          db.venueMembership.upsert({
            where: { userId_venueId: { userId: input.userId, venueId: input.venueId } },
            create: {
              userId: input.userId,
              venueId: input.venueId,
              role: input.role,
            },
            update: {
              role: input.role,
            },
          }),
        markInviteAccepted: async (inviteId, acceptedAt) => {
          await db.venueInvite.update({
            where: { id: inviteId },
            data: {
              status: "ACCEPTED",
              acceptedAt,
            },
          });
        },
      },
      {
        token: parsedToken.data.token,
        userId: user.id,
        userEmail: user.email,
      },
    );

    if (!result.ok) {
      if (result.code === "not_found") return apiError(404, "not_found", result.message);
      if (result.code === "forbidden") return apiError(403, "forbidden", result.message);
      return apiError(409, "invalid_state", result.message);
    }

    await setOnboardingFlagForSession(user, "hasAcceptedInvite", true, { path: "/api/invites/[token]/accept" });

    return NextResponse.json({
      accepted: true,
      venueId: result.venueId,
      membership: {
        id: result.membership.id,
        role: result.membership.role,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
