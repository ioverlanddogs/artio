import type { PrismaClient } from "@prisma/client";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId, logCronSummary, tryAcquireCronLock } from "@/lib/cron-runtime";
import { getProvider, type ProviderName } from "@/lib/ingest/providers";

const ROUTE = "/api/cron/artworks/enrich-descriptions";
const CRON_NAME = "enrich_artwork_descriptions";
const BATCH_SIZE = 10;
const SCORE_THRESHOLD = 60;
const MIN_DESCRIPTION_LENGTH = 20;
const DEFAULT_DESCRIPTION_PROMPT = `You are an art writer. Given
artwork metadata, write a concise, professional description
(2–3 sentences, 40–80 words). Focus on the work's visual
character, materials, and mood. Do not invent facts not in
the metadata. Return only the description text with no
preamble or quotes.`;

function noStoreJson(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

function resolveProviderApiKey(
  provider: "openai" | "gemini" | "claude",
  settings: {
    openAiApiKey?: string | null;
    anthropicApiKey?: string | null;
    geminiApiKey?: string | null;
  },
): string {
  switch (provider) {
    case "claude":
      return settings.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    case "gemini":
      return settings.geminiApiKey ?? process.env.GEMINI_API_KEY ?? "";
    default:
      return settings.openAiApiKey ?? process.env.OPENAI_API_KEY ?? "";
  }
}

export async function runCronEnrichArtworkDescriptions(
  cronSecret: string | null,
  { db }: { db: PrismaClient },
): Promise<Response> {
  const authFailure = validateCronRequest(cronSecret, { route: ROUTE });
  if (authFailure) return withNoStore(authFailure);

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cronRunId = createCronRunId();

  const settings = await db.siteSettings.findUnique({
    where: { id: "default" },
    select: {
      artworkExtractionProvider: true,
      openAiApiKey: true,
      anthropicApiKey: true,
      geminiApiKey: true,
      artworkExtractionSystemPrompt: true,
    },
  });

  const hasApiKey =
    settings?.openAiApiKey ||
    settings?.anthropicApiKey ||
    settings?.geminiApiKey ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!hasApiKey) {
    return noStoreJson({
      ok: true,
      cronName: CRON_NAME,
      cronRunId,
      skipped: true,
      reason: "no_api_key_configured",
    });
  }

  const lock = await tryAcquireCronLock(db, "cron:artwork:enrich-descriptions");
  if (!lock.acquired) {
    const summary = {
      ok: false,
      reason: "lock_not_acquired",
      cronName: CRON_NAME,
      cronRunId,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      processedCount: 0,
      errorCount: 0,
      dryRun: false,
      lock: "skipped" as const,
      enriched: 0,
      skipped: 0,
      failed: 0,
      noApiKey: false,
    };

    logCronSummary(summary);
    return noStoreJson(summary);
  }

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const artworks = await db.artwork.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        completenessUpdatedAt: { not: null },
        OR: [
          { completenessScore: { lt: SCORE_THRESHOLD } },
          {
            completenessFlags: {
              has: "LOW_CONFIDENCE_DESCRIPTION",
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        medium: true,
        year: true,
        dimensions: true,
        artist: { select: { name: true } },
        description: true,
        completenessFlags: true,
      },
      orderBy: { completenessScore: "asc" },
      take: BATCH_SIZE,
    });

    const targets = artworks.filter(
      (artwork) =>
        !artwork.description ||
        artwork.description.trim().length < MIN_DESCRIPTION_LENGTH ||
        artwork.completenessFlags.includes(
          "LOW_CONFIDENCE_DESCRIPTION"
        ),
    );

    const provider = getProvider((settings?.artworkExtractionProvider as ProviderName | null) ?? "claude");
    const apiKey = resolveProviderApiKey(provider.name, settings ?? {});

    if (!apiKey) {
      const summary = {
        ok: true,
        cronName: CRON_NAME,
        cronRunId,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        processedCount: 0,
        errorCount: 0,
        dryRun: false,
        lock: "acquired" as const,
        enriched,
        skipped,
        failed,
        noApiKey: true,
      };

      logCronSummary(summary);
      return noStoreJson(summary);
    }

    const systemPrompt = settings?.artworkExtractionSystemPrompt?.trim() || DEFAULT_DESCRIPTION_PROMPT;

    for (const artwork of targets) {
      try {
        const userPrompt = [
          `Title: ${artwork.title}`,
          artwork.artist?.name ? `Artist: ${artwork.artist.name}` : null,
          artwork.medium ? `Medium: ${artwork.medium}` : null,
          artwork.year ? `Year: ${artwork.year}` : null,
          artwork.dimensions ? `Dimensions: ${artwork.dimensions}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const result = await provider.extract({
          html: userPrompt,
          sourceUrl: "",
          systemPrompt,
          jsonSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
            },
            required: ["description"],
          },
          model: "",
          apiKey,
        });

        const generated =
          typeof result.raw === "object" && result.raw
            ? (result.raw as Record<string, unknown>).description
            : null;

        if (typeof generated === "string" && generated.trim().length >= MIN_DESCRIPTION_LENGTH) {
          await db.artwork.update({
            where: { id: artwork.id },
            data: {
              description: generated.trim(),
              completenessUpdatedAt: null,
            },
          });
          enriched += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn("cron_enrich_artwork_descriptions_failed", {
          artworkId: artwork.id,
          error,
        });
      }
    }
  } finally {
    await lock.release();
  }

  const summary = {
    ok: true,
    cronName: CRON_NAME,
    cronRunId,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    processedCount: enriched,
    errorCount: failed,
    dryRun: false,
    lock: "acquired" as const,
    enriched,
    skipped,
    failed,
    noApiKey: false,
  };

  logCronSummary(summary);
  return noStoreJson(summary);
}
