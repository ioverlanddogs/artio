import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { runCronArchiveEvents } from "@/lib/cron-archive-events";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runCronArchiveEvents(extractCronSecret(req.headers), { db });
}

export async function POST(req: NextRequest) {
  return runCronArchiveEvents(extractCronSecret(req.headers), { db });
}
