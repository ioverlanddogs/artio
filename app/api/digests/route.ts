import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, isAuthError } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { paramsToObject, zodDetails } from "@/lib/validators";
import { listDigestsForUser } from "@/lib/digests";

export const runtime = "nodejs";

const querySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = querySchema.safeParse(paramsToObject(req.nextUrl.searchParams));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid query", zodDetails(parsed.error));

    const result = await listDigestsForUser(db as never, {
      userId: user.id,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
