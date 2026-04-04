import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

const patchSchema = z.object({
  emailOnSubmissionResult: z.boolean().optional(),
  emailOnTeamInvite: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, "At least one field required");

export async function GET() {
  try {
    const user = await requireAuth();
    const prefs = await db.userNotificationPrefs.findUnique({
      where: { userId: user.id },
      select: { emailOnSubmissionResult: true, emailOnTeamInvite: true, weeklyDigest: true },
    });
    return NextResponse.json({
      emailOnSubmissionResult: prefs?.emailOnSubmissionResult ?? true,
      emailOnTeamInvite: prefs?.emailOnTeamInvite ?? true,
      weeklyDigest: prefs?.weeklyDigest ?? false,
    });
  } catch {
    return apiError(401, "unauthorized", "Authentication required");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload");

    const prefs = await db.userNotificationPrefs.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
      select: { emailOnSubmissionResult: true, emailOnTeamInvite: true, weeklyDigest: true },
    });
    return NextResponse.json(prefs);
  } catch {
    return apiError(401, "unauthorized", "Authentication required");
  }
}
