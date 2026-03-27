import type { PrismaClient } from "@prisma/client";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId, logCronSummary, tryAcquireCronLock } from "@/lib/cron-runtime";

const ROUTE = "/api/cron/artworks/normalize-fields";
const CRON_NAME = "normalize_artwork_fields";
const BATCH_SIZE = 50;
const YEAR_PATTERN = /\b(1[4-9]\d{2}|20[0-2]\d)\b/;
const MEDIUM_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\boil\s+on\s+canvas\b/i, "Oil on canvas"],
  [/\bacrylic\s+on\s+canvas\b/i, "Acrylic on canvas"],
  [/\bwatercolou?r\b/i, "Watercolour"],
  [/\bphotograph\b/i, "Photography"],
  [/\bmixed\s+media\b/i, "Mixed media"],
  [/\bscreen\s*print\b/i, "Screenprint"],
  [/\blinocut\b/i, "Linocut"],
  [/\betching\b/i, "Etching"],
  [/\blithograph\b/i, "Lithograph"],
  [/\bpencil\b/i, "Pencil on paper"],
  [/\bcharcoal\b/i, "Charcoal on paper"],
  [/\bpastel\b/i, "Pastel"],
  [/\bsculpture\b/i, "Sculpture"],
  [/\bceramics?\b/i, "Ceramics"],
  [/\bvideo\b/i, "Video"],
  [/\binstallation\b/i, "Installation"],
  [/\bprints?\b/i, "Print"],
];

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

function normalizeMedium(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  for (const [pattern, normalized] of MEDIUM_NORMALIZATIONS) {
    if (pattern.test(trimmed)) return normalized;
  }

  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed;
}

function extractYearFromTitle(title: string | null): number | null {
  if (!title) return null;
  const match = YEAR_PATTERN.exec(title);
  return match ? Number.parseInt(match[1], 10) : null;
}

export async function runCronNormalizeArtworkFields(
  cronSecret: string | null,
  { db }: { db: PrismaClient },
): Promise<Response> {
  const authFailure = validateCronRequest(cronSecret, { route: ROUTE });
  if (authFailure) return withNoStore(authFailure);

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cronRunId = createCronRunId();

  const lock = await tryAcquireCronLock(db, "cron:artwork:normalize-fields");
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
      normalized: 0,
      skipped: 0,
      failed: 0,
    };
    logCronSummary(summary);
    return noStoreJson(summary);
  }

  let normalized = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const artworks = await db.artwork.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        OR: [
          { medium: { not: null } },
          { year: null },
        ],
      },
      select: {
        id: true,
        title: true,
        medium: true,
        year: true,
      },
      orderBy: { updatedAt: "asc" },
      take: BATCH_SIZE * 10,
    });

    for (let i = 0; i < artworks.length; i += BATCH_SIZE) {
      const batch = artworks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (artwork) => {
          const patch: { medium?: string; year?: number } = {};
          const normalizedMedium = normalizeMedium(artwork.medium);
          if (normalizedMedium && normalizedMedium !== artwork.medium) {
            patch.medium = normalizedMedium;
          }

          if (!artwork.year) {
            const inferredYear = extractYearFromTitle(artwork.title);
            if (inferredYear) patch.year = inferredYear;
          }

          if (Object.keys(patch).length === 0) {
            return false;
          }

          await db.artwork.update({
            where: { id: artwork.id },
            data: { ...patch, completenessUpdatedAt: null },
          });
          return true;
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value) normalized += 1;
          else skipped += 1;
        } else {
          failed += 1;
          console.warn("cron_normalize_artwork_fields_failed", { error: result.reason });
        }
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
    processedCount: normalized,
    errorCount: failed,
    dryRun: false,
    lock: "acquired" as const,
    normalized,
    skipped,
    failed,
  };

  logCronSummary(summary);
  return noStoreJson(summary);
}
