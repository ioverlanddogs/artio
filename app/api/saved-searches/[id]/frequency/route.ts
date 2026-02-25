import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOwnedSavedSearch } from "@/lib/saved-searches-management";
import { idParamSchema, parseBody, savedSearchFrequencySchema, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const parsedId = idParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));
    const parsedBody = savedSearchFrequencySchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid frequency payload", zodDetails(parsedBody.error));

    const isOwned = await assertOwnedSavedSearch(
      (id, userId) => db.savedSearch.findFirst({ where: { id, userId }, select: { id: true } }),
      parsedId.data.id,
      user.id,
    );
    if (!isOwned) return apiError(404, "not_found", "Saved search not found");

    const nextFrequency = parsedBody.data.frequency;
    await db.savedSearch.update({
      where: { id: parsedId.data.id },
      data: {
        frequency: "WEEKLY",
        isEnabled: nextFrequency === "WEEKLY",
      },
    });

    return NextResponse.json({ ok: true, frequency: nextFrequency });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
