import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronSyncGoogleEvents } from "@/lib/cron-sync-google-events";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runCronSyncGoogleEvents(extractCronSecret(req.headers), { db });
}

export async function POST(req: NextRequest) {
  return runCronSyncGoogleEvents(extractCronSecret(req.headers), { db });
}
