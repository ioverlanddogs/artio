import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { idParamSchema, parseBody, zodDetails } from "@/lib/validators";
import { normalizeSavedSearchParams, savedSearchPatchSchema } from "@/lib/saved-searches";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const parsedId = idParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));
    const parsedBody = savedSearchPatchSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid saved search payload", zodDetails(parsedBody.error));

    const existing = await db.savedSearch.findFirst({ where: { id: parsedId.data.id, userId: user.id } });
    if (!existing) return apiError(404, "not_found", "Saved search not found");

    const item = await db.savedSearch.update({
      where: { id: existing.id },
      data: {
        ...(parsedBody.data.name != null ? { name: parsedBody.data.name } : {}),
        ...(parsedBody.data.frequency != null ? { frequency: parsedBody.data.frequency } : {}),
        ...(parsedBody.data.isEnabled != null ? { isEnabled: parsedBody.data.isEnabled } : {}),
        ...(parsedBody.data.params !== undefined ? { paramsJson: normalizeSavedSearchParams(existing.type, parsedBody.data.params) } : {}),
      },
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const parsedId = idParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    await db.savedSearch.deleteMany({ where: { id: parsedId.data.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Login required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
