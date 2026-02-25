import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { markAllNotificationsRead } from "@/lib/notification-inbox";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireAuth();
    const updatedCount = await markAllNotificationsRead(user.id);

    return NextResponse.json({ ok: true, updated: updatedCount });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
