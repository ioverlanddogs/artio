import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationsReadBatchSchema, parseBody, zodDetails } from "@/lib/validators";
import { scopedReadBatchIds } from "@/lib/notifications-read-batch";
import { markNotificationsReadWithDb } from "@/lib/notification-inbox";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = notificationsReadBatchSchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid read batch payload", zodDetails(parsed.error));

    const owned = await db.notification.findMany({ where: { userId: user.id, id: { in: parsed.data.ids } }, select: { id: true } });
    const ids = scopedReadBatchIds(parsed.data.ids, owned.map((item) => item.id));

    if (!ids.length) return NextResponse.json({ ok: true, updated: 0 });

    const updated = await markNotificationsReadWithDb(db, { userId: user.id, notificationIds: ids });
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
