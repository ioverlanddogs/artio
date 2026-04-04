import { z } from "zod";
import { Prisma, type PerfSnapshot } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildExplainTarget, explainQueryNames, type ExplainQueryName } from "@/lib/perf/queries";
import { runExplain } from "@/lib/perf/explain";

export const explainRequestSchema = z.object({
  name: z.enum(explainQueryNames),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const listSnapshotsSchema = z.object({
  name: z.enum(explainQueryNames).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.guid().optional(),
});

export async function createPerfSnapshotWithDeps(
  deps: {
    requireAdminUser: () => Promise<{ id: string }>;
    explain: (queryName: ExplainQueryName, queryParams: Record<string, unknown>) => Promise<string>;
    createSnapshot: (input: { name: ExplainQueryName; createdByUserId: string; paramsJson: Prisma.InputJsonValue; explainText: string; durationMs: number }) => Promise<Pick<PerfSnapshot, "id">>;
  },
  input: z.infer<typeof explainRequestSchema>,
) {
  const user = await deps.requireAdminUser();
  const target = buildExplainTarget(input.name, input.params ?? {});
  const startedAt = performance.now();
  const explainText = await deps.explain(input.name, input.params ?? {});
  const durationMs = Math.round(performance.now() - startedAt);
  const snapshot = await deps.createSnapshot({
    name: input.name,
    createdByUserId: user.id,
    paramsJson: target.sanitizedParams as Prisma.InputJsonValue,
    explainText,
    durationMs,
  });

  return { snapshotId: snapshot.id, explainText };
}

export async function createPerfSnapshot(input: z.infer<typeof explainRequestSchema>) {
  return createPerfSnapshotWithDeps(
    {
      requireAdminUser: requireAdmin,
      explain: runExplain,
      createSnapshot: (payload) =>
        db.perfSnapshot.create({
          data: payload,
          select: { id: true },
        }),
    },
    input,
  );
}
