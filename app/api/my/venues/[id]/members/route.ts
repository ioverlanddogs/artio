import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireVenueMemberManager } from "@/lib/venue-access";
import { parseBody, venueIdParamSchema, venueMemberDirectAddSchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    await requireVenueMemberManager(parsedId.data.id);

    const members = await db.venueMembership.findMany({
      where: { venueId: parsedId.data.id },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json(members.map((member) => ({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      user: member.user,
    })));
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = venueIdParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    await requireVenueMemberManager(parsedId.data.id);

    const parsedBody = venueMemberDirectAddSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const targetUser = await db.user.findUnique({
      where: { email: parsedBody.data.email },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return apiError(400, "invalid_request", "User not found for that email");
    }

    const member = await db.venueMembership.upsert({
      where: { userId_venueId: { userId: targetUser.id, venueId: parsedId.data.id } },
      create: {
        userId: targetUser.id,
        venueId: parsedId.data.id,
        role: parsedBody.data.role,
      },
      update: {
        role: parsedBody.data.role,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      user: member.user,
    }, { status: 201 });
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
