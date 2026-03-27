import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronNormalizeArtworkFields } from "@/lib/cron-normalize-artwork-fields";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return runCronNormalizeArtworkFields(extractCronSecret(req.headers), { db });
}

export async function POST(req: NextRequest) {
  return runCronNormalizeArtworkFields(extractCronSecret(req.headers), { db });
}
