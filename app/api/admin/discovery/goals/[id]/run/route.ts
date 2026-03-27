import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { runGoalDiscovery } from "@/lib/discovery/run-goal-discovery";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;

  const settings = await db.siteSettings.findUnique({
    where: { id: "default" },
    select: {
      googlePseApiKey: true,
      googlePseCx: true,
      braveSearchApiKey: true,
    },
  });

  const result = await runGoalDiscovery({
    goalId: id,
    db,
    env: {
      googlePseApiKey: settings?.googlePseApiKey,
      googlePseCx: settings?.googlePseCx,
      braveSearchApiKey: settings?.braveSearchApiKey,
    },
  });

  return NextResponse.json(result);
}
