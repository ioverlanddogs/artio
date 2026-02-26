import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { ensureDbUserForSession } from "@/lib/ensure-db-user-for-session";
import { getMyDashboard } from "@/lib/my/dashboard/get-my-dashboard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return apiError(401, "unauthorized", "Authentication required");

    const dbUser = await ensureDbUserForSession(session);
    const userId = dbUser?.id ?? session.id;
    const venueId = req.nextUrl.searchParams.get("venueId");

    const data = await getMyDashboard({ userId, venueId });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
