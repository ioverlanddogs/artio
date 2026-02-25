import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isAuthError } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { idParamSchema, zodDetails } from "@/lib/validators";
import { getDigestByIdForUser } from "@/lib/digests";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const parsedId = idParamSchema.safeParse(await params);
    if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

    const digest = await getDigestByIdForUser(db as never, { id: parsedId.data.id, userId: user.id });
    if (!digest) return apiError(404, "not_found", "Digest not found");

    return NextResponse.json(digest);
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
