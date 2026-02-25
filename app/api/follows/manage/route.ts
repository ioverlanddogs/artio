import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFollowManageData, getFollowManageDataSafe } from "@/lib/follows-manage";
import { hasDatabaseUrl } from "@/lib/runtime-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!hasDatabaseUrl()) return NextResponse.json({ artists: [], venues: [] });

    const data = await getFollowManageDataSafe(() => getFollowManageData(db, user.id));
    return NextResponse.json(data);
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return NextResponse.json({ artists: [], venues: [] });
  }
}
