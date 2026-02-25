import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { parseBody, zodDetails } from "@/lib/validators";
import { normalizeSavedSearchParams, savedSearchCreateSchema } from "@/lib/saved-searches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = savedSearchCreateSchema.safeParse(await parseBody(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid saved search payload", zodDetails(parsed.error));

    const normalized = normalizeSavedSearchParams(parsed.data.type, parsed.data.params);
    const item = await db.savedSearch.create({
      data: {
        userId: user.id,
        type: parsed.data.type,
        name: parsed.data.name,
        paramsJson: normalized,
        frequency: parsed.data.frequency ?? "WEEKLY",
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
