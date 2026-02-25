import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeBulkDeleteTargets } from "@/lib/follows-manage";
import { followManageBulkDeleteSchema, parseBody, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = followManageBulkDeleteSchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid bulk unfollow payload", zodDetails(parsed.error));

    const targets = normalizeBulkDeleteTargets(parsed.data.targets);
    const result = await db.follow.deleteMany({
      where: {
        userId: user.id,
        OR: targets,
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
