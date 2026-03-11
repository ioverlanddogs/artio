import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { parseBody, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const digestPreferencesPatchSchema = z.object({
  digestEnabled: z.boolean().optional(),
  digestEventsOnly: z.boolean().optional(),
  digestRadiusKm: z.union([z.literal(5), z.literal(10), z.literal(25), z.literal(50), z.null()]).optional(),
  digestMaxEvents: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsedBody = digestPreferencesPatchSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const updated = await db.user.update({
      where: { id: user.id },
      data: parsedBody.data,
      select: {
        digestEnabled: true,
        digestEventsOnly: true,
        digestRadiusKm: true,
        digestMaxEvents: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
