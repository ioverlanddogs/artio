import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronIngestVenues } from "@/lib/cron-ingest-venues";
import { getRequestId } from "@/lib/request-id";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runCronIngestVenues(
    extractCronSecret(req.headers),
    Object.fromEntries(req.nextUrl.searchParams.entries()),
    db as never,
    { requestId: getRequestId(req.headers), method: req.method },
  );
}

export async function POST(req: NextRequest) {
  return runCronIngestVenues(
    extractCronSecret(req.headers),
    Object.fromEntries(req.nextUrl.searchParams.entries()),
    db as never,
    { requestId: getRequestId(req.headers), method: req.method },
  );
}
