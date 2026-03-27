# Enrichment Workbench — Merge & Review Fixes
**4 tasks · 1 commit each · run pnpm typecheck after every task**

---

## Task 1 — Fix artist bio enrichment: remove discoverArtist dependency

**File:** `lib/enrichment/enrich-artist-bio.ts`

### Problem
The current implementation calls `discoverArtist()` which requires
a linked `eventId`. Artists added manually or via claims have no
events and always return `status: "skipped"` with reason
`"artist_has_no_event_context"`. The function also creates
`IngestExtractedArtist` candidates as a side effect — not
appropriate for a manual enrichment workbench.

### What to read first
```
cat lib/enrichment/enrich-artist-bio.ts
cat lib/enrichment/enrich-artwork-description.ts   # pattern to follow
cat lib/ingest/artist-confidence.ts                # scoreArtistCandidate signature
cat lib/ingest/providers/index.ts                  # getProvider()
```

### Rewrite enrich-artist-bio.ts

Replace the entire file. The new implementation:

1. Fetches the artist record (id, name, bio, websiteUrl,
   instagramUrl, twitterUrl, mediums, nationality, birthYear)

2. Builds search query from template + artist name.
   Searches if `searchEnabled !== false`.
   Uses the best URL from results — not blindly `results[0]`.
   Score each result: +2 if snippet contains the artist name
   (case-insensitive), +1 if URL contains a slug of the name,
   +1 if URL is from a known art domain (artsy.net, tate.org.uk,
   moma.org, royalacademy.org.uk, saatchigallery.com,
   theguardian.com, frieze.com, artforum.com). Use the
   highest-scoring result, fall back to `results[0]` if all score 0.

3. Copies the `resolveProviderApiKey` local function from
   `lib/enrichment/enrich-artwork-description.ts` — do not import
   it from anywhere else.

4. Fetches the page HTML at `searchUrl` using
   `fetchHtmlWithGuards` from `@/lib/ingest/fetch-html`.
   Wraps in try/catch — if fetch fails, skip gracefully.

5. Calls `provider.extract()` with this JSON schema:
   ```ts
   {
     type: "object",
     additionalProperties: false,
     properties: {
       bio:          { type: ["string", "null"] },
       mediums:      { type: "array", items: { type: "string" } },
       websiteUrl:   { type: ["string", "null"] },
       instagramUrl: { type: ["string", "null"] },
       twitterUrl:   { type: ["string", "null"] },
       nationality:  { type: ["string", "null"] },
     },
     required: ["bio", "mediums", "websiteUrl",
                "instagramUrl", "twitterUrl", "nationality"],
   }
   ```
   System prompt:
   ```
   You are an art researcher. Given a webpage about an artist,
   extract: a concise professional bio (2-4 sentences), their
   primary mediums as an array of short strings, their website
   URL, Instagram URL, Twitter/X URL, and nationality.
   Return null for any field not found. Do not invent facts.
   ```

6. Builds a patch of ONLY missing/improvable fields using
   `shouldApply()` from `@/lib/enrichment/types`. For mediums:
   only apply if the extracted array is non-empty and the artist
   currently has no mediums OR gapFilter is "ALL".

7. If patch is empty: return `status: "skipped"`,
   reason `"no_improvement_found"`.

8. Writes the patch via `db.artist.update()`.

9. Recalculates confidence before and after using
   `scoreArtistCandidate()`. Pass `birthYear: null` and
   `searchQuery: query` and `wikipediaMatch` as
   `!!searchUrl?.includes("wikipedia.org")`.

10. Returns the full `EnrichItemResult` including
    `fieldsBefore`, `fieldsAfter`, both confidence values.

Remove the import of `discoverArtist` entirely.
Add imports for `fetchHtmlWithGuards` and `getProvider`.

pnpm typecheck after.
Commit: `"fix(enrichment): rewrite artist bio enrichment to call
AI directly, removing discoverArtist event dependency"`

---

## Task 2 — Fix venue description enrichment: remove enrichVenueFromSnapshot

**File:** `lib/enrichment/enrich-venue-description.ts`

### Problem
The call `enrichVenueFromSnapshot({ runId: \`manual-${venue.id}\` })`
passes an invalid UUID to a field that is a foreign key to
`IngestRun.id`. This will throw a FK constraint violation at runtime.
`enrichVenueFromSnapshot` is designed for automated ingest runs —
it creates `VenueEnrichmentLog` records that require a real
`IngestRun`. Manual enrichment should write directly.

### What to read first
```
cat lib/enrichment/enrich-venue-description.ts
cat lib/ingest/enrich-venue-from-snapshot.ts   # understand what it does
```

### What to change

Replace the `enrichVenueFromSnapshot` call (lines ~81-90) with
a direct `db.venue.update()`.

Current (broken):
```ts
const enriched = await enrichVenueFromSnapshot({
  db: args.db,
  venueId: venue.id,
  runId: `manual-${venue.id}`,
  sourceDomain: searchUrl,
  snapshot: { venueDescription: nextDescription },
});

const updated = await args.db.venue.findUnique({...});
const confidenceAfter = descriptionConfidence(updated?.description ?? null);

return {
  status: enriched.enriched ? "success" : "skipped",
  fieldsChanged: enriched.changedFields,
  ...
};
```

Replace with:
```ts
await args.db.venue.update({
  where: { id: venue.id },
  data: { description: nextDescription },
});

const confidenceAfter = descriptionConfidence(nextDescription);

return {
  status: "success",
  fieldsChanged: ["description"],
  fieldsBefore: { description: venue.description },
  fieldsAfter: { description: nextDescription },
  confidenceBefore,
  confidenceAfter,
  searchUrl,
};
```

Remove the import of `enrichVenueFromSnapshot` from the file.

pnpm typecheck after.
Commit: `"fix(enrichment): replace enrichVenueFromSnapshot with
direct db.venue.update to fix FK constraint violation"`

---

## Task 3 — Add staged review workflow (dry-run → stage → apply)

### Schema changes
**File:** `prisma/schema.prisma`

Add `STAGED` to `EnrichmentRunItemStatus` enum:
```prisma
enum EnrichmentRunItemStatus {
  PENDING
  STAGED    // ADD — enrichment computed but not yet applied
  SKIPPED
  SUCCESS
  FAILED
}
```

Add `STAGED` to `EnrichmentRunStatus` enum:
```prisma
enum EnrichmentRunStatus {
  PENDING
  RUNNING
  STAGED    // ADD — all items staged, awaiting admin review
  COMPLETED
  FAILED
}
```

Add `dryRun Boolean @default(false)` field to `EnrichmentRun`
model, after `searchProvider`:
```prisma
dryRun        Boolean                 @default(false)
```

Create migration:
`prisma/migrations/20270407120000_enrichment_staged/migration.sql`

```sql
DO $$ BEGIN
  ALTER TYPE "EnrichmentRunItemStatus" ADD VALUE IF NOT EXISTS 'STAGED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnrichmentRunStatus" ADD VALUE IF NOT EXISTS 'STAGED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "EnrichmentRun"
  ADD COLUMN IF NOT EXISTS "dryRun" BOOLEAN NOT NULL DEFAULT false;
```

Run `pnpm prisma generate`.

### New apply API route
**File to create:**
`app/api/admin/enrichment/runs/[id]/apply/route.ts`

```ts
// POST — applies all STAGED items in the run to the DB
// For each STAGED item:
//   - Read fieldsAfter from the item
//   - Write each field to the entity (artist/artwork/venue/event)
//   - Update item status to SUCCESS
// Update run status from STAGED → COMPLETED
// requireAdmin()
```

Logic:

1. `requireAdmin()`
2. Fetch run with all STAGED items (include entity relations for
   name display)
3. Return 404 if run not found, 400 if run status !== "STAGED"
4. For each STAGED item, read `fieldsAfter` and write to the
   correct entity table based on `entityType`:
   ```ts
   // For ARTIST items:
   if (item.artistId && item.fieldsAfter) {
     const patch = item.fieldsAfter as Record<string, unknown>;
     await db.artist.update({
       where: { id: item.artistId },
       data: sanitizePatch(patch),
     });
   }
   // Same pattern for ARTWORK, VENUE, EVENT
   ```
   `sanitizePatch` strips any keys that are not valid fields for
   that entity type — only allow the fields that enrichment
   templates can set:
   - ARTIST: bio, websiteUrl, instagramUrl, twitterUrl, mediums,
     nationality, featuredAssetId
   - ARTWORK: description, completenessUpdatedAt (set to null)
   - VENUE: description, featuredAssetId
   - EVENT: featuredAssetId

5. For each item update: set `status: "SUCCESS"` on the
   `EnrichmentRunItem`. Wrap each item in try/catch — failures
   are non-blocking, set `status: "FAILED"` and store
   `errorMessage`.

6. After all items: update `EnrichmentRun`:
   - `status: "COMPLETED"`
   - `successItems`: count of newly SUCCESS items
   - `failedItems`: count of newly FAILED items
   - `finishedAt: new Date()`

7. Return the updated run with items.

### Update POST /api/admin/enrichment/runs to support dryRun mode

**File:** `app/api/admin/enrichment/runs/route.ts`

Add `dryRun` to the `postSchema`:
```ts
dryRun: z.boolean().default(false),
```

When `dryRun: true`:
- Still search, extract, and compute the patch for each record
- Store `fieldsAfter` with the proposed values on the
  `EnrichmentRunItem`
- Set item `status: "STAGED"` instead of "SUCCESS"/"SKIPPED"
- Do NOT call `db.artist.update()` / `db.artwork.update()` etc.
- Set run `status: "STAGED"` when complete

Each enrichment function currently writes immediately. Rather
than changing each function's internals, pass a `dryRun` flag
through `EnrichmentFnArgs` and check it before the write step.

**Update `EnrichmentFnArgs` in `lib/enrichment/types.ts`:**
```ts
export type EnrichmentFnArgs = {
  db: PrismaClient;
  settings: EnrichmentSettings;
  searchProvider: "google_pse" | "brave";
  dryRun?: boolean;    // ADD
};
```

**Update each enrichment function** to check `args.dryRun` before
calling `db.*.update()`:

Pattern to add before every `db.*.update()` call:
```ts
if (args.dryRun) {
  return {
    status: "success",   // "success" means "would succeed"
    fieldsChanged: Object.keys(patch),
    fieldsBefore: { ...currentValues },
    fieldsAfter: patch,
    confidenceBefore,
    confidenceAfter: computedAfterScore,
    searchUrl,
  };
}
// existing update call follows
```

For image enrichment functions (`enrich-artist-image.ts`,
`enrich-artwork-image.ts`, `enrich-event-image.ts`) that call
`importApproved*Image()`: when `dryRun: true`, return early with
status "success", `fieldsAfter: { featuredAssetId: "PENDING_IMAGE" }`,
and skip the actual fetch + upload. The admin will see "image would
be imported" in the staged review.

**Update the runs route** to pass `dryRun` to
`runEnrichmentForTemplate` and store item status as STAGED when
`dryRun: true`:
```ts
// In the batch processing loop:
const itemStatus = dryRun
  ? "STAGED"
  : toItemStatus(result.value.status);
```

pnpm typecheck after.
Commit: `"feat(enrichment): add staged dry-run mode with
apply endpoint — review proposed changes before writing"`

---

## Task 4 — Fix run history UI: readable field diffs + apply button

**File:** `app/(admin)/admin/ingest/enrich/enrich-client.tsx`

### What to read first
```
cat app/(admin)/admin/ingest/enrich/enrich-client.tsx
```

### Changes

**1 — Add dryRun toggle to the configure panel**

Add a checkbox above the Run button:
```tsx
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={dryRun}
    onChange={e => setDryRun(e.target.checked)}
    className="rounded"
  />
  <span>Dry run — stage changes for review before applying</span>
</label>
```

Add `const [dryRun, setDryRun] = useState(true)` — default ON
so admins are protected from accidental immediate writes.

Pass `dryRun` in the POST body to `/api/admin/enrichment/runs`.

Update the run button label:
- When `dryRun: true` → "Stage N records for review →"
- When `dryRun: false` → "Run N records (writes immediately) →"

**2 — Add Apply button for STAGED runs**

In the run history table, for runs with `status === "STAGED"`,
show an "Apply all staged" button alongside the existing
Expand / Retry buttons:

```tsx
{run.status === "STAGED" ? (
  <button
    type="button"
    className="rounded border border-emerald-600 bg-emerald-50
      px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100
      disabled:opacity-50"
    disabled={applyingRunId === run.id}
    onClick={() => void applyRun(run.id)}
  >
    {applyingRunId === run.id
      ? "Applying…"
      : `Apply ${run.totalItems} staged`}
  </button>
) : null}
```

Add `applyRun` function:
```ts
async function applyRun(runId: string) {
  setApplyingRunId(runId);
  try {
    const res = await fetch(
      `/api/admin/enrichment/runs/${runId}/apply`,
      { method: "POST" }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Apply failed");
    // Update the run in local state to COMPLETED
    setRuns(prev => prev.map(r =>
      r.id === runId
        ? { ...r, status: "COMPLETED",
            successItems: data.run?.successItems ?? r.successItems }
        : r
    ));
  } catch {
    // show error inline
  } finally {
    setApplyingRunId(null);
  }
}
```

Add `const [applyingRunId, setApplyingRunId] = useState<string | null>(null)`.

Update `EnrichmentRun` type to include `status`:
```ts
export type EnrichmentRun = {
  ...existing fields...
  status?: string;    // ADD
};
```

**3 — Replace JSON.stringify with readable field diffs**

In the run item detail table, replace the two "Before" and
"After" cells that call `JSON.stringify()` with a readable
field diff component.

Replace:
```tsx
<td className="max-w-[300px] truncate px-2 py-1.5
  text-muted-foreground">
  {JSON.stringify(item.fieldsBefore ?? {})}
</td>
<td className="max-w-[300px] truncate px-2 py-1.5
  text-muted-foreground">
  {JSON.stringify(item.fieldsAfter ?? {})}
</td>
```

With an inline `FieldDiff` component rendered in a single
merged cell (colSpan=2 or keep two columns):

```tsx
function FieldDiff({
  before,
  after,
  fieldsChanged,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  fieldsChanged?: string[];
}) {
  const keys = fieldsChanged?.length
    ? fieldsChanged
    : Object.keys(after ?? {});

  if (!keys.length) {
    return (
      <span className="text-muted-foreground text-xs">—</span>
    );
  }

  return (
    <div className="space-y-1">
      {keys.map(key => {
        const oldVal = before?.[key];
        const newVal = after?.[key];
        const display = (v: unknown): string => {
          if (v == null) return "—";
          if (key === "featuredAssetId")
            return v === "PENDING_IMAGE"
              ? "(image would be imported)"
              : "(image set)";
          if (Array.isArray(v)) return v.join(", ") || "—";
          const s = String(v);
          return s.length > 80 ? s.slice(0, 77) + "…" : s;
        };
        return (
          <div key={key} className="text-xs">
            <span className="text-muted-foreground
              font-medium">{key}: </span>
            {oldVal !== newVal ? (
              <>
                <span className="line-through
                  text-rose-600/70">
                  {display(oldVal)}
                </span>
                {" → "}
                <span className="text-emerald-700">
                  {display(newVal)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {display(newVal)} (unchanged)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

Use it in the detail table:
```tsx
<td className="px-2 py-1.5" colSpan={2}>
  <FieldDiff
    before={item.fieldsBefore}
    after={item.fieldsAfter}
    fieldsChanged={item.fieldsChanged}
  />
</td>
```

Update the `<thead>` to merge "Before" and "After" into a
single "Changes" column header.

Also add `fieldsChanged?: string[]` to the `RunDetailItem` type
and ensure it's included in the GET `/api/admin/enrichment/runs/[id]`
response (check that the route selects `fieldsChanged` on items).

**4 — Add status badge for STAGED runs in the history table**

Update `statusChip` function to handle "STAGED":
```ts
case "STAGED":
  return "bg-blue-100 text-blue-800";
```

Add a "STAGED" column value to the run status display in the
history table header row so admins can see which runs are
awaiting apply vs completed.

pnpm typecheck after.
Commit: `"feat(enrichment): add dry-run toggle, apply button,
and readable field diffs to enrichment workbench UI"`

---

## Constraints
- No new npm dependencies
- `resolveProviderApiKey` in Task 1: copy locally from
  `lib/enrichment/enrich-artwork-description.ts`
- Task 1: remove the `discoverArtist` import entirely — no
  `IngestExtractedArtist` records are created by the workbench
- Task 2: remove the `enrichVenueFromSnapshot` import entirely
- Task 3: `dryRun` defaults to `false` in the API schema but
  the UI (Task 4) defaults it to `true` — this protects admins
  while leaving the API flexible for programmatic use
- Task 3: image enrichment dry-run returns
  `fieldsAfter: { featuredAssetId: "PENDING_IMAGE" }` as a
  sentinel value — the apply route must NOT write this sentinel
  to the DB (it should trigger the actual image import instead)
- pnpm typecheck must pass after every task
