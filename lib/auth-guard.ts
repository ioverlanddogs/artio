import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, requireUser, requireVenueRole, type SessionUser } from "@/lib/auth";
import { isForbiddenError } from "@/lib/http-errors";
import type { VenueMembershipRole } from "@prisma/client";

function authErrorToResponse(error: unknown, requestId?: string) {
  if (isForbiddenError(error)) {
    return apiError(403, "forbidden", "Insufficient permissions", undefined, requestId);
  }
  return apiError(401, "unauthorized", "Authentication required", undefined, requestId);
}

export async function guardUser(requestId?: string): Promise<SessionUser | NextResponse> {
  try {
    return await requireUser();
  } catch (error) {
    return authErrorToResponse(error, requestId);
  }
}

export async function guardAdmin(requestId?: string): Promise<SessionUser | NextResponse> {
  try {
    return await requireAdmin();
  } catch (error) {
    return authErrorToResponse(error, requestId);
  }
}

export async function guardVenueRole(venueId: string, minRole: VenueMembershipRole = "EDITOR", requestId?: string): Promise<SessionUser | NextResponse> {
  try {
    return await requireVenueRole(venueId, minRole);
  } catch (error) {
    return authErrorToResponse(error, requestId);
  }
}
