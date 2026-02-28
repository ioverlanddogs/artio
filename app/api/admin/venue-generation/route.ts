import { Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { VenueGenerationError, createOpenAIResponsesClient, runVenueGenerationPipeline } from "@/lib/venue-generation/generation-pipeline";
import { venueGenerationInputSchema } from "@/lib/venue-generation/schemas";
import { parseBody, zodDetails } from "@/lib/validators";

export const runtime = "nodejs";

type VenueGenerationPostDeps = {
  requireAdminFn: typeof requireAdmin;
  parseBodyFn: typeof parseBody;
  createOpenAiClientFn: typeof createOpenAIResponsesClient;
  runVenueGenerationPipelineFn: typeof runVenueGenerationPipeline;
  dbClient: typeof db;
  openAiApiKey?: string;
};

export async function handleVenueGenerationPost(req: NextRequest, deps?: Partial<VenueGenerationPostDeps>) {
  try {
    const requireAdminFn = deps?.requireAdminFn ?? requireAdmin;
    const parseBodyFn = deps?.parseBodyFn ?? parseBody;
    const createOpenAiClientFn = deps?.createOpenAiClientFn ?? createOpenAIResponsesClient;
    const runVenueGenerationPipelineFn = deps?.runVenueGenerationPipelineFn ?? runVenueGenerationPipeline;
    const dbClient = deps?.dbClient ?? db;

    const admin = await requireAdminFn();
    const parsed = venueGenerationInputSchema.safeParse(await parseBodyFn(req));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));

    const apiKey = deps?.openAiApiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) return apiError(500, "OPENAI_KEY_MISSING", "OPENAI_API_KEY is required");

    const openai = await createOpenAiClientFn({ apiKey });
    const result = await runVenueGenerationPipelineFn({
      input: parsed.data,
      triggeredById: admin.id,
      db: dbClient,
      openai,
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAuthError(error)) return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Forbidden");
    if (error instanceof VenueGenerationError) {
      if (error.code === "OPENAI_HTTP_ERROR") return apiError(502, "OPENAI_HTTP_ERROR", error.message, error.details);
      if (error.code === "OPENAI_BAD_OUTPUT") return apiError(502, "OPENAI_BAD_OUTPUT", error.message, error.details);
      if (error.code === "OPENAI_SCHEMA_MISMATCH") return apiError(502, "OPENAI_SCHEMA_MISMATCH", error.message, error.details);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
      return apiError(500, "DB_SCHEMA_OUT_OF_DATE", "Database schema is out of date for venue generation", {
        prismaCode: error.code,
      });
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function POST(req: NextRequest) {
  noStore();
  return handleVenueGenerationPost(req);
}
