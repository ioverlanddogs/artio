import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { idParamSchema } from "@/lib/validators";

type RejectDeps = {
  requireAdminFn: typeof requireAdmin;
  dbClient: typeof db;
};

const defaultDeps: RejectDeps = {
  requireAdminFn: requireAdmin,
  dbClient: db,
};

export async function handleVenueHomepageImageReject(
  _req: NextRequest,
  context: { params: Promise<{ id: string; candidateId: string }> },
  deps?: Partial<RejectDeps>,
): Promise<NextResponse> {
  const resolved = { ...defaultDeps, ...deps };

  try {
    const admin = await resolved.requireAdminFn();
    const params = await context.params;
    const parsedVenueId = idParamSchema.safeParse({ id: params.id });
    const parsedCandidateId = idParamSchema.safeParse({ id: params.candidateId });
    if (!parsedVenueId.success || !parsedCandidateId.success) return apiError(400, "invalid_request", "Invalid route parameter");

    const candidate = await resolved.dbClient.venueHomepageImageCandidate.findFirst({
      where: { id: parsedCandidateId.data.id, venueId: parsedVenueId.data.id },
      select: { id: true, status: true, url: true },
    });

    if (!candidate) return apiError(404, "not_found", "Homepage image candidate not found");
    if (candidate.status !== "pending") return apiError(409, "already_processed", "Candidate has already been selected or rejected");

    await resolved.dbClient.venueHomepageImageCandidate.update({ where: { id: candidate.id }, data: { status: "rejected" } });
    await resolved.dbClient.adminAuditLog.create({
      data: {
        userId: admin.id,
        action: "venue_homepage_image_rejected",
        targetType: "venue",
        targetId: parsedVenueId.data.id,
        metadata: { candidateId: candidate.id, url: candidate.url },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
