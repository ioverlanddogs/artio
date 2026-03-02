import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAdminRoute } from "@/lib/admin-route";
import { parseBody } from "@/lib/validators";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withAdminRoute(async ({ actorEmail }) => {
    const body = (await parseBody(req)) as {
      action?: string;
      targetType?: string;
      targetId?: string;
      metadata?: unknown;
    };

    await logAdminAction({
      actorEmail,
      action: body.action ?? "admin.audit.test",
      targetType: body.targetType ?? "test",
      targetId: body.targetId,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
      req,
    });

    return NextResponse.json({ ok: true });
  });
}
