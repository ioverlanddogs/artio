# Phase 1 — Artwork Completeness Scoring
**4 tasks · ~4 hours · 1 commit each**

Persists completeness scores and flags on the Artwork model so
gaps can be queried at the DB level, then surfaces them in a
new Data Gaps Explorer tab in the admin ingest panel.

No new dependencies. No existing lib functions removed or broken.

---

## Task 1 — Schema: add completeness fields to Artwork model
**File:** `prisma/schema.prisma`
**File to create:** `prisma/migrations/[timestamp]_artwork_completeness_fields/migration.sql`
**Effort:** ~30 min

### What to read first
```
sed -n '/^model Artwork /,/^}/p' prisma/schema.prisma
ls prisma/migrations/ | sort | tail -3
cat prisma/migrations/20270403120000_add_artwork_inquiry_read_at/migration.sql
```

### Changes to schema.prisma

Add three fields to the `Artwork` model, after the `deletedReason`
field and before the relation fields:

```prisma
completenessScore    Int       @default(0)
completenessFlags    String[]  @default([])
completenessUpdatedAt DateTime?
```

Add a DB index for gap-finding queries:
```prisma
@@index([completenessScore])
@@index([completenessFlags])
```

### Migration SQL

Create:
`prisma/migrations/20270404120000_artwork_completeness_fields/migration.sql`

```sql
ALTER TABLE "Artwork"
  ADD COLUMN IF NOT EXISTS "completenessScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completenessFlags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "completenessUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Artwork_completenessScore_idx"
  ON "Artwork"("completenessScore");

CREATE INDEX IF NOT EXISTS "Artwork_completenessFlags_idx"
  ON "Artwork" USING GIN("completenessFlags");
```

Use the IF NOT EXISTS guard pattern matching the existing
migrations in this repo.

After editing schema.prisma run:
```
pnpm prisma generate
pnpm typecheck
```

**Commit:** `feat(schema): add completenessScore, completenessFlags, completenessUpdatedAt to Artwork`

---

## Task 2 — Extend computeArtworkCompleteness to derive flags
**File:** `lib/artwork-completeness.ts`
**Effort:** ~30 min

### What to read first
```
cat lib/artwork-completeness.ts
```

### What to add

The existing `computeArtworkCompleteness()` already computes
`scorePct` from 5 checks. Extend it to also return a `flags`
array matching the plan's flag vocabulary, and extend
`ArtworkCompletenessInput` to include `dimensions` and
`provenance` so the score reflects all 7 plan fields.

**Step 1 — Add flag type:**

```ts
export type ArtworkCompletenessFlag =
  | 'MISSING_IMAGE'
  | 'LOW_CONFIDENCE_METADATA'
  | 'INCOMPLETE';
```

Do NOT add `POSSIBLE_DUPLICATE` — that requires a separate
deduplication pass and is out of scope for Phase 1.

**Step 2 — Extend ArtworkCompletenessInput:**

```ts
export type ArtworkCompletenessInput = {
  title: string | null;
  description: string | null;
  medium: string | null;
  year: number | null;
  featuredAssetId: string | null;
  dimensions: string | null;   // ADD
  provenance: string | null;   // ADD
};
```

Both new fields are already on the Artwork model — callers
just need to pass them. All existing callers that do not pass
these fields will need the type updated but no logic breaks
because the checks are additive.

**Step 3 — Update computeArtworkCompleteness to return flags:**

Add `flags` to `ArtworkCompletenessResult`:

```ts
export type ArtworkCompletenessResult = {
  scorePct: number;
  required: { ok: boolean; issues: ArtworkCompletenessIssue[] };
  recommended: { ok: boolean; issues: ArtworkCompletenessIssue[] };
  flags: ArtworkCompletenessFlag[];   // ADD
};
```

Inside `computeArtworkCompleteness`, add recommended checks
for dimensions and provenance, then derive flags:

```ts
// After existing recommended checks, add:
if (!(artwork.dimensions ?? '').trim()) {
  recommendedIssues.push({
    code: 'MISSING_DIMENSIONS' as ArtworkCompletenessIssueCode,
    label: 'Add dimensions.',
    field: 'dimensions' as any,
  });
}

if (!(artwork.provenance ?? '').trim()) {
  recommendedIssues.push({
    code: 'MISSING_PROVENANCE' as ArtworkCompletenessIssueCode,
    label: 'Add provenance.',
    field: 'provenance' as any,
  });
}

// Update checksTotal to 7 (was 5):
const checksTotal = 7;

// Derive flags:
const flags: ArtworkCompletenessFlag[] = [];
const hasImage = Boolean(artwork.featuredAssetId) || imageCount > 0;
if (!hasImage) flags.push('MISSING_IMAGE');
if (scorePct < 60) flags.push('INCOMPLETE');
if (requiredIssues.length > 0) flags.push('LOW_CONFIDENCE_METADATA');
```

Update the return value to include `flags`.

**Step 4 — Fix callers**

Search for all callers of `computeArtworkCompleteness`:
```
grep -rn "computeArtworkCompleteness" app/ lib/ --include="*.ts" --include="*.tsx"
```

For each caller, add `dimensions: null, provenance: null` to
the input if those fields are not available at the call site.
Do not change any caller's existing logic — just extend the
input object.

Run `pnpm typecheck` after.

**Commit:** `feat(completeness): extend computeArtworkCompleteness with flags and dimensions/provenance checks`

---

## Task 3 — Backfill cron: score all artworks nightly
**File to create:** `lib/cron-score-artwork-completeness.ts`
**File to create:** `app/api/cron/artworks/score-completeness/route.ts`
**Effort:** ~60 min

### What to read first
```
cat lib/cron-archive-events.ts         # cron auth + lock pattern
cat lib/cron-runtime.ts                # tryAcquireCronLock signature
cat lib/artwork-completeness.ts        # after Task 2
```

### What to build

A nightly cron that finds artworks whose `completenessUpdatedAt`
is null or older than 24 hours, computes their score and flags,
and writes the results back to the DB.

**`lib/cron-score-artwork-completeness.ts`**

```ts
import { validateCronRequest, extractCronSecret }
  from '@/lib/cron-auth';
import { tryAcquireCronLock, createCronRunId,
  logCronSummary } from '@/lib/cron-runtime';
import { computeArtworkCompleteness }
  from '@/lib/artwork-completeness';
import type { PrismaClient } from '@prisma/client';

const CRON_NAME = 'score_artwork_completeness';
const BATCH_SIZE = 50;
const STALE_HOURS = 24;

export async function runCronScoreArtworkCompleteness(
  cronSecret: string | null,
  { db }: { db: PrismaClient },
): Promise<Response> {
  const authFailure = validateCronRequest(cronSecret, {
    route: '/api/cron/artworks/score-completeness',
  });
  if (authFailure) return authFailure;

  const lock = await tryAcquireCronLock(
    db, 'cron:artwork:score-completeness'
  );
  if (!lock.acquired) {
    return Response.json(
      { ok: false, reason: 'lock_not_acquired' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const cronRunId = createCronRunId();
  const startedAtMs = Date.now();
  let scored = 0;
  let failed = 0;

  try {
    const staleThreshold = new Date(
      Date.now() - STALE_HOURS * 60 * 60 * 1000
    );

    // Find artworks needing scoring:
    // - never scored (completenessUpdatedAt is null)
    // - OR score is stale (completenessUpdatedAt < threshold)
    const artworks = await db.artwork.findMany({
      where: {
        deletedAt: null,
        OR: [
          { completenessUpdatedAt: null },
          { completenessUpdatedAt: { lt: staleThreshold } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        medium: true,
        year: true,
        featuredAssetId: true,
        dimensions: true,
        provenance: true,
        _count: { select: { images: true } },
      },
      orderBy: { completenessUpdatedAt: 'asc' },
      take: BATCH_SIZE * 10, // fetch ahead, process in batches
    });

    // Process in BATCH_SIZE chunks
    for (let i = 0; i < artworks.length; i += BATCH_SIZE) {
      const batch = artworks.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (artwork) => {
          try {
            const result = computeArtworkCompleteness(
              {
                title: artwork.title,
                description: artwork.description,
                medium: artwork.medium,
                year: artwork.year,
                featuredAssetId: artwork.featuredAssetId,
                dimensions: artwork.dimensions,
                provenance: artwork.provenance,
              },
              artwork._count.images,
            );

            await db.artwork.update({
              where: { id: artwork.id },
              data: {
                completenessScore: result.scorePct,
                completenessFlags: result.flags,
                completenessUpdatedAt: new Date(),
              },
            });
            scored += 1;
          } catch {
            failed += 1;
          }
        })
      );
    }
  } finally {
    await lock.release();
  }

  logCronSummary({
    cronName: CRON_NAME,
    cronRunId,
    startedAtMs,
    summary: { scored, failed },
  });

  return Response.json(
    { ok: true, scored, failed },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
```

**`app/api/cron/artworks/score-completeness/route.ts`**

```ts
import { NextRequest } from 'next/server';
import { extractCronSecret } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { runCronScoreArtworkCompleteness }
  from '@/lib/cron-score-artwork-completeness';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return runCronScoreArtworkCompleteness(
    extractCronSecret(req.headers), { db }
  );
}

export async function POST(req: NextRequest) {
  return runCronScoreArtworkCompleteness(
    extractCronSecret(req.headers), { db }
  );
}
```

Read `lib/cron-runtime.ts` to confirm the exact signature of
`tryAcquireCronLock` — in particular whether `lock.release()`
or `lock.release?.()` is the correct call pattern. Match the
existing cron files exactly.

Run `pnpm typecheck` after.

**Commit:** `feat(cron): add nightly artwork completeness scoring cron`

---

## Task 4 — Data Gaps Explorer tab
**Files to create:**
- `app/(admin)/admin/ingest/data-gaps/page.tsx`
- `app/(admin)/admin/ingest/data-gaps/data-gaps-client.tsx`

**Files to update:**
- `app/(admin)/admin/ingest/_components/ingest-shell-client.tsx`
- `app/(admin)/admin/ingest/layout.tsx`

**Effort:** ~60 min

### What to read first
```
cat app/(admin)/admin/ingest/_components/ingest-shell-client.tsx
cat app/(admin)/admin/ingest/layout.tsx
cat app/(admin)/admin/ingest/ready-to-publish/page.tsx  # query pattern
cat app/(admin)/admin/ingest/ready-to-publish/ready-to-publish-client.tsx  # chip filter pattern
```

### Step 1 — Add tab to nav in ingest-shell-client.tsx

The Operations group currently has: Trigger / Runs, Venue Map,
Logs, Health.

Add a "Data Gaps" tab to the Operations group, before Logs:

```tsx
<Link
  href="/admin/ingest/data-gaps"
  className={`rounded-t-md px-3 py-2 text-sm ${
    pathname.startsWith('/admin/ingest/data-gaps')
      ? 'bg-muted font-medium text-foreground'
      : 'text-muted-foreground hover:text-foreground'
  }`}
>
  <span className="flex items-center gap-1.5">
    Data Gaps
    {stats.artworksWithGaps > 0 ? (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5
        text-xs font-medium tabular-nums text-amber-800">
        {stats.artworksWithGaps}
      </span>
    ) : null}
  </span>
</Link>
```

Add `artworksWithGaps` to the stats prop type:
```ts
stats: {
  // ... existing fields ...
  artworksWithGaps: number;   // ADD
}
```

### Step 2 — Add artworksWithGaps to layout.tsx

Read the layout file. Add to the existing `Promise.all`:

```ts
db.artwork.count({
  where: {
    deletedAt: null,
    completenessFlags: { isEmpty: false },
  },
}),
```

Destructure as `artworksWithGaps` and add to the stats object:
```ts
artworksWithGaps,
```

### Step 3 — Page server component

`app/(admin)/admin/ingest/data-gaps/page.tsx`

```tsx
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import AdminPageHeader from
  '@/app/(admin)/admin/_components/AdminPageHeader';
import { DataGapsClient } from './data-gaps-client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function DataGapsPage({
  searchParams,
}: {
  searchParams: Promise<{
    flag?: string;
    page?: string;
  }>;
}) {
  await requireAdmin({ redirectOnFail: true });

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const flag = params.flag ?? null;

  const validFlags = [
    'MISSING_IMAGE',
    'LOW_CONFIDENCE_METADATA',
    'INCOMPLETE',
  ];
  const flagFilter = flag && validFlags.includes(flag)
    ? flag : null;

  const where = {
    deletedAt: null,
    ...(flagFilter
      ? { completenessFlags: { has: flagFilter } }
      : { completenessFlags: { isEmpty: false } }
    ),
  };

  const [artworks, total, flagCounts] = await Promise.all([
    db.artwork.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        completenessScore: true,
        completenessFlags: true,
        completenessUpdatedAt: true,
        medium: true,
        year: true,
        featuredAssetId: true,
        artist: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { completenessScore: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.artwork.count({ where }),
    // Count per flag for the filter chips
    Promise.all(
      validFlags.map(async (f) => ({
        flag: f,
        count: await db.artwork.count({
          where: {
            deletedAt: null,
            completenessFlags: { has: f },
          },
        }),
      }))
    ),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <AdminPageHeader
        title="Data gaps"
        description={
          `${total} artwork${total !== 1 ? 's' : ''} with ` +
          `missing or incomplete data — sorted by lowest score first.`
        }
      />
      <DataGapsClient
        artworks={artworks}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentFlag={flagFilter}
        flagCounts={flagCounts}
      />
    </>
  );
}
```

### Step 4 — Client component

`app/(admin)/admin/ingest/data-gaps/data-gaps-client.tsx`

Mark `'use client'`.

Props:
```ts
type Artwork = {
  id: string;
  title: string;
  slug: string | null;
  completenessScore: number;
  completenessFlags: string[];
  completenessUpdatedAt: Date | null;
  medium: string | null;
  year: number | null;
  featuredAssetId: string | null;
  artist: { id: string; name: string; slug: string };
};

type Props = {
  artworks: Artwork[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentFlag: string | null;
  flagCounts: Array<{ flag: string; count: number }>;
};
```

Render:

**Filter chips row** — same pattern as ready-to-publish-client:
```tsx
// All artworks with any flag
// + one chip per flag with its count
// Active chip uses darker bg
// Uses useRouter + usePathname to update URL params
// Changing flag resets to page 1
```

**Table** — one row per artwork:

| Score bar | Title (linked to /admin/artwork/[id]) | Artist | Flags | Medium | Year | Last scored |
|-----------|---------------------------------------|--------|-------|--------|------|-------------|

Score bar: same `h-1.5 w-16 overflow-hidden rounded bg-muted`
pattern from ready-to-publish-client. Green ≥ 80%, amber 40–79%,
red < 40%.

Flags: render each flag as a small pill:
- MISSING_IMAGE → red pill "No image"
- LOW_CONFIDENCE_METADATA → amber pill "Low confidence"
- INCOMPLETE → amber pill "Incomplete"

Actions column: "Edit" link to `/admin/artwork/[id]`.

**Pagination** — prev/next buttons using useRouter + usePathname,
same pattern as RunsFilters.

**Empty state** (no gaps found):
```tsx
<div className="rounded-lg border bg-background p-10
  text-center text-sm text-muted-foreground">
  No artworks with data gaps.
  {completenessUpdatedAt has never been set:}
  Run the scoring cron first.
</div>
```

Show a note if `artworks.length > 0 && artworks[0].completenessUpdatedAt === null`:
"Completeness scores have not been computed yet. Trigger the
scoring cron at /api/cron/artworks/score-completeness to
populate this view."

Run `pnpm typecheck` after.

**Commit:** `feat(ingest): add Data Gaps Explorer tab with flag filters, score bars, and pagination`

---

## Constraints
- No changes to existing lib exports — only additive
- `computeArtworkCompleteness` must remain backward-compatible:
  all existing callers still work if they pass
  `dimensions: null, provenance: null`
- No new npm dependencies
- The `completenessFlags: { isEmpty: false }` Prisma filter
  requires Prisma 4.6+. Verify this works by checking the
  Prisma version in package.json before using it. If not
  supported, use `{ not: { equals: [] } }` as fallback.
- `POSSIBLE_DUPLICATE` flag is explicitly out of scope for
  Phase 1 — do not implement it
- pnpm typecheck must pass after every task
