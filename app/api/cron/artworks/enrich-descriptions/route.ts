import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronEnrichArtworkDescriptions } from "@/lib/cron-enrich-artwork-descriptions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return runCronEnrichArtworkDescriptions(extractCronSecret(req.headers), { db });
}

export async function POST(req: NextRequest) {
  return runCronEnrichArtworkDescriptions(extractCronSecret(req.headers), { db });
}
