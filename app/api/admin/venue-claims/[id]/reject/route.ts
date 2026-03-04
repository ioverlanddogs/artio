import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin({ redirectOnFail: false });
    const { id } = await params;
    const claim = await db.venueClaimRequest.findUnique({ where: { id } });
    if (!claim) return apiError(404, "not_found", "Claim not found");

    await db.venueClaimRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "unauthorized" || error.message === "forbidden")) {
      return apiError(403, "forbidden", "Admin role required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
