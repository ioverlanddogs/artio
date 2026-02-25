import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth, isAuthError } from "@/lib/auth";
import { markOnboardingCompletedForSession } from "@/lib/onboarding";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireAuth();
    await markOnboardingCompletedForSession(user, { path: "/api/onboarding/complete" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthError(error)) {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
