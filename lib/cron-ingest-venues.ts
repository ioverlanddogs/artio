import { z } from "zod";
import { validateCronRequest } from "@/lib/cron-auth";
import { createCronRunId, logCronSummary, shouldDryRun, tryAcquireCronLock } from "@/lib/cron-runtime";
import { captureException, withSpan } from "@/lib/monitoring";
import { sendAlert } from "@/lib/alerts";
import { markCronFailure, markCronSuccess } from "@/lib/ops-metrics";
import { runVenueIngestExtraction } from "@/lib/ingest/extraction-pipeline";

const CRON_NAME = "ingest_venues";
const ROUTE = "/api/cron/ingest/venues";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const DEFAULT_MIN_HOURS_SINCE_LAST_RUN = 24;
const MAX_SCAN_VENUES = 125;
const MAX_DURATION_MS = 45_000;

const querySchema = z.object({
  dryRun: z.enum(["1", "true"]).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  minHoursSinceLastRun: z.coerce.number().int().min(1).max(24 * 14).default(DEFAULT_MIN_HOURS_SINCE_LAST_RUN),
});

type IngestVenueDb = {
  venue: {
    findMany: (args: {
      where: { websiteUrl: { not: null }; isPublished: true; deletedAt: null };
      orderBy: { updatedAt: "asc" };
      take: number;
      select: { id: true; websiteUrl: true };
    }) => Promise<Array<{ id: string; websiteUrl: string | null }>>;
  };
  ingestRun: {
    findFirst: (args: {
      where: { venueId: string; status: { in: Array<"RUNNING" | "SUCCEEDED"> } };
      orderBy: { createdAt: "desc" };
      select: { createdAt: true };
    }) => Promise<{ createdAt: Date } | null>;
  };
  $queryRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

type IngestExtractionRunner = typeof runVenueIngestExtraction;

function noStoreJson(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export async function runCronIngestVenues(
  headerSecret: string | null,
  rawQuery: Record<string, string>,
  cronDb: IngestVenueDb,
  meta: { requestId?: string; method?: string } = {},
  deps: {
    runExtraction?: IngestExtractionRunner;
    now?: () => number;
  } = {},
) {
  const authFailureResponse = validateCronRequest(headerSecret, { route: ROUTE, ...meta });
  if (authFailureResponse) return withNoStore(authFailureResponse);

  const startedAtMs = (deps.now ?? Date.now)();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const cronRunId = createCronRunId();

  const normalizedQuery = { ...rawQuery };
  if (shouldDryRun(rawQuery.dryRun)) normalizedQuery.dryRun = "true";

  const parsed = querySchema.safeParse(normalizedQuery);
  if (!parsed.success) {
    return noStoreJson({
      ok: false,
      cronName: CRON_NAME,
      cronRunId,
      error: { code: "invalid_query", message: "Invalid cron query", details: parsed.error.flatten() },
    }, 400);
  }

  const dryRun = parsed.data.dryRun === "true";
  const lock = await tryAcquireCronLock(cronDb, "cron:ingest:venues");
  if (!lock.acquired) {
    const summary = {
      ok: true,
      cronName: CRON_NAME,
      cronRunId,
      startedAt: startedAtIso,
      finishedAt: new Date((deps.now ?? Date.now)()).toISOString(),
      durationMs: (deps.now ?? Date.now)() - startedAtMs,
      processedCount: 0,
      errorCount: 0,
      dryRun,
      lock: "skipped" as const,
      skipped: true,
      reason: "lock_not_acquired",
    };
    logCronSummary(summary);
    await markCronSuccess(CRON_NAME, summary.finishedAt, cronRunId);
    return noStoreJson(summary);
  }

  try {
    return await withSpan("cron:ingest_venues", async () => {
      if (process.env.AI_INGEST_ENABLED !== "1") {
        const summary = {
          ok: true,
          cronName: CRON_NAME,
          cronRunId,
          startedAt: startedAtIso,
          finishedAt: new Date((deps.now ?? Date.now)()).toISOString(),
          durationMs: (deps.now ?? Date.now)() - startedAtMs,
          processedCount: 0,
          errorCount: 0,
          dryRun,
          lock: lock.supported ? "acquired" as const : "unsupported" as const,
          skipped: true,
          reason: "ingest_disabled",
        };
        logCronSummary(summary);
        await markCronSuccess(CRON_NAME, summary.finishedAt, cronRunId);
        return noStoreJson(summary);
      }

      const sourceVenues = await cronDb.venue.findMany({
        where: {
          websiteUrl: { not: null },
          isPublished: true,
          deletedAt: null,
        },
        orderBy: { updatedAt: "asc" },
        take: Math.min(MAX_SCAN_VENUES, Math.max(parsed.data.limit * 5, parsed.data.limit)),
        select: { id: true, websiteUrl: true },
      });

      const minLastRunAt = new Date((deps.now ?? Date.now)() - parsed.data.minHoursSinceLastRun * 60 * 60 * 1000);
      const venueState = await Promise.all(sourceVenues.map(async (venue) => {
        const latestRun = await cronDb.ingestRun.findFirst({
          where: { venueId: venue.id, status: { in: ["RUNNING", "SUCCEEDED"] } },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        return {
          venue,
          lastRunAt: latestRun?.createdAt ?? null,
        };
      }));

      const eligibleVenues = venueState
        .filter((item) => typeof item.venue.websiteUrl === "string" && item.venue.websiteUrl.trim().length > 0 && (!item.lastRunAt || item.lastRunAt < minLastRunAt))
        .sort((a, b) => {
          if (!a.lastRunAt && !b.lastRunAt) return 0;
          if (!a.lastRunAt) return -1;
          if (!b.lastRunAt) return 1;
          return a.lastRunAt.getTime() - b.lastRunAt.getTime();
        })
        .slice(0, parsed.data.limit);

      let succeeded = 0;
      let failed = 0;
      let createdCandidates = 0;
      let dedupedCandidates = 0;
      let timedOut = false;
      const venueResults: Array<Record<string, unknown>> = [];
      const runExtraction = deps.runExtraction ?? runVenueIngestExtraction;

      for (const item of eligibleVenues) {
        if ((deps.now ?? Date.now)() - startedAtMs >= MAX_DURATION_MS) {
          timedOut = true;
          venueResults.push({ venueId: item.venue.id, status: "skipped_timeout" });
          continue;
        }

        if (dryRun) {
          venueResults.push({ venueId: item.venue.id, status: "would_run" });
          continue;
        }

        try {
          const result = await runExtraction({ venueId: item.venue.id, sourceUrl: item.venue.websiteUrl as string });
          succeeded += 1;
          createdCandidates += result.createdCount;
          dedupedCandidates += result.dedupedCount;
          venueResults.push({ venueId: item.venue.id, runId: result.runId, status: "succeeded", createdCount: result.createdCount, dedupedCount: result.dedupedCount });
        } catch (error) {
          failed += 1;
          const errorCode = error && typeof error === "object" && "code" in error ? String(error.code) : "INGEST_FAILED";
          venueResults.push({ venueId: item.venue.id, status: "failed", errorCode });
        }
      }

      const summary = {
        ok: failed === 0,
        cronName: CRON_NAME,
        cronRunId,
        startedAt: startedAtIso,
        finishedAt: new Date((deps.now ?? Date.now)()).toISOString(),
        durationMs: (deps.now ?? Date.now)() - startedAtMs,
        processedCount: dryRun ? 0 : succeeded + failed,
        errorCount: failed,
        dryRun,
        lock: lock.supported ? "acquired" as const : "unsupported" as const,
        considered: venueState.length,
        selected: eligibleVenues.length,
        runCount: dryRun ? 0 : succeeded + failed,
        wouldRun: dryRun ? eligibleVenues.length : 0,
        succeeded,
        failed,
        createdCandidates,
        dedupedCandidates,
        timedOut,
        limit: parsed.data.limit,
        minHoursSinceLastRun: parsed.data.minHoursSinceLastRun,
        venues: venueResults,
      };

      logCronSummary(summary);
      if (summary.errorCount > 0) {
        await markCronFailure(CRON_NAME, `failed=${summary.errorCount}`, summary.finishedAt, cronRunId);
        await sendAlert({
          severity: "error",
          title: "Cron ingest venue extraction failures",
          body: `cron=${CRON_NAME} cronRunId=${cronRunId} failed=${summary.errorCount} durationMs=${summary.durationMs}`,
          tags: { cronName: CRON_NAME, cronRunId, errorCount: summary.errorCount, durationMs: summary.durationMs },
        });
      } else {
        await markCronSuccess(CRON_NAME, summary.finishedAt, cronRunId);
      }

      return noStoreJson(summary, summary.ok ? 200 : 500);
    }, { route: ROUTE, requestId: meta.requestId, cronRunId, userScope: false });
  } catch (error) {
    captureException(error, { route: ROUTE, requestId: meta.requestId, cronRunId, userScope: false });
    const summary = {
      ok: false,
      cronName: CRON_NAME,
      cronRunId,
      startedAt: startedAtIso,
      finishedAt: new Date((deps.now ?? Date.now)()).toISOString(),
      durationMs: (deps.now ?? Date.now)() - startedAtMs,
      processedCount: 0,
      errorCount: 1,
      dryRun,
      lock: lock.supported ? "acquired" as const : "unsupported" as const,
      error: { code: "internal_error", message: "Cron execution failed", details: undefined },
    };
    await markCronFailure(CRON_NAME, "internal_error", summary.finishedAt, cronRunId);
    await sendAlert({
      severity: "error",
      title: "Cron execution failed",
      body: `cron=${CRON_NAME} cronRunId=${cronRunId} durationMs=${summary.durationMs}`,
      tags: { cronName: CRON_NAME, cronRunId, durationMs: summary.durationMs },
    });
    logCronSummary(summary);
    return noStoreJson(summary, 500);
  } finally {
    await lock.release();
  }
}
