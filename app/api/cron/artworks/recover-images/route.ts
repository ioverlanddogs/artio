import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronRecoverArtworkImages } from "@/lib/cron-recover-artwork-images";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return runCronRecoverArtworkImages(extractCronSecret(req.headers), { db });
}

export async function POST(req: NextRequest) {
  return runCronRecoverArtworkImages(extractCronSecret(req.headers), { db });
}
