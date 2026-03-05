import { NextResponse } from "next/server";
import { withAdminRoute } from "@/lib/admin-route";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { idParamSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdminRoute(async () => {
    const { id } = await params;
    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid venue id");
    const candidates = await db.venueHomepageImageCandidate.findMany({
      where: { venueId: parsed.data.id, status: "pending" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, url: true, source: true, sortOrder: true, status: true },
    });
    return NextResponse.json({ candidates }, { headers: { "Cache-Control": "no-store" } });
  });
}
