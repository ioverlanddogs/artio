import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { markNotificationRead } from "@/lib/notification-inbox";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const updated = await markNotificationRead(user.id, id);
    if (!updated) {
      return apiError(404, "not_found", "Notification not found");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
