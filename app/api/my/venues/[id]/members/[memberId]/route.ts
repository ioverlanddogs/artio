import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { canRemoveOwnerMember } from "@/lib/ownership";
import { requireVenueMemberManager } from "@/lib/venue-access";
import { memberIdParamSchema, parseBody, venueIdParamSchema, venueMemberPatchSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

async function ensureNotLastOwnerOnRoleChange(venueId: string, memberId: string, nextRole: "OWNER" | "EDITOR") {
  const currentMember = await db.venueMembership.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, venueId: true },
  });
  if (!currentMember || currentMember.venueId !== venueId) return { error: apiError(404, "not_found", "Member not found") };

  if (currentMember.role === "OWNER" && nextRole !== "OWNER") {
    const ownerCount = await db.venueMembership.count({ where: { venueId, role: "OWNER" } });
    if (ownerCount <= 1) {
      return { error: apiError(409, "invalid_state", "Cannot remove the last owner") };
    }
  }

  return { currentMember };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const parsedParamsRaw = await params;
    const parsedVenueId = venueIdParamSchema.safeParse({ id: parsedParamsRaw.id });
    if (!parsedVenueId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedVenueId.error));
    const parsedMemberId = memberIdParamSchema.safeParse({ memberId: parsedParamsRaw.memberId });
    if (!parsedMemberId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedMemberId.error));

    await requireVenueMemberManager(parsedVenueId.data.id);

    const parsedBody = venueMemberPatchSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const check = await ensureNotLastOwnerOnRoleChange(parsedVenueId.data.id, parsedMemberId.data.memberId, parsedBody.data.role);
    if ("error" in check) return check.error;

    const member = await db.venueMembership.update({
      where: { id: parsedMemberId.data.memberId },
      data: { role: parsedBody.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      user: member.user,
    });
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

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const parsedParamsRaw = await params;
    const parsedVenueId = venueIdParamSchema.safeParse({ id: parsedParamsRaw.id });
    if (!parsedVenueId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedVenueId.error));
    const parsedMemberId = memberIdParamSchema.safeParse({ memberId: parsedParamsRaw.memberId });
    if (!parsedMemberId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedMemberId.error));

    await requireVenueMemberManager(parsedVenueId.data.id);

    const existing = await db.venueMembership.findUnique({
      where: { id: parsedMemberId.data.memberId },
      select: { id: true, role: true, venueId: true },
    });

    if (!existing || existing.venueId !== parsedVenueId.data.id) {
      return apiError(404, "not_found", "Member not found");
    }

    if (existing.role === "OWNER") {
      const ownerCount = await db.venueMembership.count({ where: { venueId: parsedVenueId.data.id, role: "OWNER" } });
      if (!canRemoveOwnerMember(ownerCount, "OWNER")) {
        return apiError(409, "invalid_state", "Cannot remove the last owner");
      }
    }

    await db.venueMembership.delete({ where: { id: existing.id } });
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
