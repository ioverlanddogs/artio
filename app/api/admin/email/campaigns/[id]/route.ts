import { CampaignAudience, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

const campaignUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().optional().nullable(),
  audienceType: z.nativeEnum(CampaignAudience).optional(),
  audienceFilter: z.record(z.string(), z.unknown()).optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED"]).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const parsed = campaignUpdateSchema.safeParse(await parseBody(req));
    if (!parsed.success) {
      return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));
    }

    const campaign = await db.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return apiError(404, "not_found", "Campaign not found");
    if (campaign.status !== "DRAFT") return apiError(409, "conflict", "Only DRAFT campaigns can be updated");

    const updated = await db.emailCampaign.update({
      where: { id },
      data: {
        ...parsed.data,
        audienceFilter: parsed.data.audienceFilter === undefined
          ? undefined
          : parsed.data.audienceFilter === null
            ? Prisma.JsonNull
            : (parsed.data.audienceFilter as Prisma.InputJsonValue),
        scheduledFor: parsed.data.scheduledFor === undefined ? undefined : (parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null),
      },
    });

    return Response.json(updated);
  } catch {
    return apiError(403, "forbidden", "Admin role required");
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { status: true } });
    if (!campaign) return apiError(404, "not_found", "Campaign not found");
    if (campaign.status !== "DRAFT") return apiError(409, "conflict", "Only DRAFT campaigns can be deleted");

    await db.emailCampaign.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return apiError(403, "forbidden", "Admin role required");
  }
}
