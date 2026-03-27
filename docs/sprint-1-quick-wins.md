# Sprint 1 — Quick wins
**5 independent tasks · ~3 hours total · 1 commit each**

These tasks touch different files with no dependencies between them.
Execute in any order. Run `pnpm typecheck` after each task.

---

## Task 1 — Stale content archival cron
**File to create:** `app/api/cron/events/archive/route.ts`
**File to create:** `lib/cron-archive-events.ts`
**Effort:** ~45 min

### What to read first
```
cat prisma/schema.prisma | grep -A5 "model Event {"
cat app/api/admin/events/\[id\]/archive/route.ts
cat lib/admin-events-route.ts | grep -A20 "handleAdminEntityArchive"
cat app/api/cron/ingest/route.ts   # copy the cron auth + lock pattern
```

### What to build

**`lib/cron-archive-events.ts`**

A function `runCronArchiveEvents` that:

1. Validates the cron secret using `validateCronRequest` from
   `@/lib/cron-auth` — same pattern as all other cron routes.

2. Acquires a distributed lock using `tryAcquireCronLock` from
   `@/lib/cron-runtime` with key `"cron:archive:events"`.
   Return early if lock not acquired.

3. Finds published events that are past their end date (or
   past `startAt + 7 days` if `endAt` is null):
   ```ts
   const cutoff = new Date();
   await db.event.findMany({
     where: {
       status: "PUBLISHED",
       isPublished: true,
       deletedAt: null,
       OR: [
         { endAt: { lt: cutoff } },
         {
           endAt: null,
           startAt: {
             lt: new Date(cutoff.getTime() - 7 * 24 * 60 * 60 * 1000)
           },
         },
       ],
     },
     select: { id: true, title: true, startAt: true },
     take: 200,
   })
   ```

4. For each event, update to archived:
   ```ts
   await db.event.update({
     where: { id: event.id },
     data: {
       status: "ARCHIVED",
       isPublished: false,
     },
   })
   ```
   Process in batches of 20. Catch per-event errors and
   continue — do not let one failure abort the whole run.

5. Finds venues with no upcoming events and no successful
   ingest run in the last 90 days — flag them for review
   (do NOT auto-archive venues, only flag):
   ```ts
   const staleCutoff = new Date(
     Date.now() - 90 * 24 * 60 * 60 * 1000
   );
   await db.venue.findMany({
     where: {
       status: "PUBLISHED",
       deletedAt: null,
       events: {
         none: {
           startAt: { gte: new Date() },
           deletedAt: null,
         },
       },
       ingestRuns: {
         none: {
           status: "SUCCEEDED",
           createdAt: { gte: staleCutoff },
         },
       },
     },
     select: { id: true, name: true },
     take: 50,
   })
   ```
   Log a warning for each stale venue using `console.warn`
   with a structured object `{ event: "stale_venue_detected",
   venueId, venueName }`. Do NOT update their status.

6. Return a summary:
   ```ts
   { archivedEvents: number, staleVenuesLogged: number }
   ```

7. Release the cron lock.

**`app/api/cron/events/archive/route.ts`**

```ts
import { NextRequest } from "next/server";
import { extractCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { runCronArchiveEvents } from "@/lib/cron-archive-events";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runCronArchiveEvents(
    extractCronSecret(req.headers), { db }
  );
}

export async function POST(req: NextRequest) {
  return runCronArchiveEvents(
    extractCronSecret(req.headers), { db }
  );
}
```

### Constraints
- No schema changes
- Venues are never auto-archived — only logged
- Per-event errors are non-blocking
- Same cron auth + lock pattern as existing cron routes

**Commit:** `feat(cron): add stale event archival cron — archive past events, log stale venues`

---

## Task 2 — Venue onboarding: pre-fill events URL from generation run
**File:** `app/(admin)/admin/ingest/venue-onboarding/venue-onboarding-client.tsx`
**Effort:** ~20 min

### What to read first
```
cat app/(admin)/admin/ingest/venue-onboarding/venue-onboarding-client.tsx
cat app/(admin)/admin/ingest/venue-onboarding/page.tsx
```

### What to change

The onboarding client already reads `eventsPageStatus` from
`venue.generationRunItems[0]`. The generation run item also
has `eventsPageUrl` but the page query does not select it
and the client does not use it.

**Step 1 — Update the page query** in
`app/(admin)/admin/ingest/venue-onboarding/page.tsx`:

Find `generationRunItems` in the select and add `eventsPageUrl`:
```ts
generationRunItems: {
  where: { status: "pending" },    // keep existing where if present
  orderBy: { sortOrder: "asc" },   // keep existing orderBy if present
  select: {
    id: true,
    eventsPageStatus: true,
    eventsPageUrl: true,           // ADD THIS
  },
},
```
Read the current select carefully and only add `eventsPageUrl`
— do not change anything else.

**Step 2 — Update the OnboardingVenue type** in the client:
```ts
generationRunItems: Array<{
  eventsPageStatus: string;
  eventsPageUrl?: string | null;  // ADD THIS
}>;
```

**Step 3 — Pre-fill the events URL input** when
`eventsPageStatus === "detected"` and the run item has a URL.

Find where `onboardingVenueId` is set (the button that
expands the onboarding form for a venue). In that same
handler, also pre-fill `eventsUrlInputs` if the generated
URL is available:

```ts
// When expanding onboarding form for a venue:
setOnboardingVenueId(venue.id);
const detectedUrl =
  venue.generationRunItems[0]?.eventsPageUrl ?? "";
if (detectedUrl) {
  setEventsUrlInputs(prev => ({
    ...prev,
    [venue.id]: detectedUrl,
  }));
}
```

**Step 4 — Show a "Auto-detected" label** next to the
input when the value was pre-filled from the generation run:

Find the events URL input in the onboarding form.
After/below the input, show:
```tsx
{venue.generationRunItems[0]?.eventsPageUrl &&
eventsUrlInputs[venue.id] ===
  venue.generationRunItems[0]?.eventsPageUrl ? (
  <p className="text-xs text-emerald-700 mt-1">
    ✓ Auto-detected from venue generation
  </p>
) : null}
```

The admin can still edit the pre-filled value before
publishing — the input remains editable.

### Constraints
- No API route changes
- No schema changes
- The input must remain fully editable after pre-fill

**Commit:** `feat(onboarding): pre-fill events URL from venue generation run when auto-detected`

---

## Task 3 — Runs page: venue filter + status filter + pagination
**File:** `app/(admin)/admin/ingest/runs/page.tsx`
**Effort:** ~40 min

### What to read first
```
cat app/(admin)/admin/ingest/runs/page.tsx
```

### What to build

The runs page currently fetches the 20 most recent runs
system-wide with no filtering. Replace the static server
query with URL search param driven filtering.

**Step 1 — Add search params to the page**

```ts
export default async function AdminIngestRunsPage({
  searchParams,
}: {
  searchParams: Promise<{
    venueId?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(params.page ?? 1));
  const venueId = params.venueId ?? null;
  const status = params.status ?? null;
```

**Step 2 — Update the runs query**

```ts
const validStatuses = ["PENDING","RUNNING","SUCCEEDED","FAILED"];
const statusFilter = status && validStatuses.includes(status)
  ? status : null;

const where = {
  ...(venueId ? { venueId } : {}),
  ...(statusFilter ? { status: statusFilter } : {}),
};

const [runs, totalRuns, venues] = await Promise.all([
  db.ingestRun.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      createdAt: true,
      status: true,
      sourceUrl: true,
      fetchStatus: true,
      errorCode: true,
      createdCandidates: true,
      venue: { select: { id: true, name: true } },
    },
  }),
  db.ingestRun.count({ where }),
  db.venue.findMany({
    where: { websiteUrl: { not: null }, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, websiteUrl: true,
      ingestFrequency: true },
    take: 200,
  }),
]);

const totalPages = Math.ceil(totalRuns / PAGE_SIZE);
```

**Step 3 — Add a RunsFilters client component** as a
new file `app/(admin)/admin/ingest/runs/runs-filters.tsx`
(mark it `"use client"`):

```tsx
"use client";
import { useRouter, useSearchParams, usePathname }
  from "next/navigation";

type Props = {
  venues: Array<{ id: string; name: string }>;
  currentVenueId: string | null;
  currentStatus: string | null;
  currentPage: number;
  totalPages: number;
  totalRuns: number;
};

export function RunsFilters({ venues, currentVenueId,
  currentStatus, currentPage, totalPages,
  totalRuns }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(
      window.location.search
    );
    if (value) params.set(key, value);
    else params.delete(key);
    // Reset to page 1 when filter changes
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center
      gap-3 rounded-lg border bg-background p-3">
      <select
        className="rounded border bg-background
          px-3 py-1.5 text-sm"
        value={currentVenueId ?? ""}
        onChange={e =>
          update("venueId", e.target.value || null)
        }
      >
        <option value="">All venues</option>
        {venues.map(v => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <select
        className="rounded border bg-background
          px-3 py-1.5 text-sm"
        value={currentStatus ?? ""}
        onChange={e =>
          update("status", e.target.value || null)
        }
      >
        <option value="">All statuses</option>
        <option value="SUCCEEDED">Succeeded</option>
        <option value="FAILED">Failed</option>
        <option value="RUNNING">Running</option>
        <option value="PENDING">Pending</option>
      </select>

      <span className="ml-auto text-xs
        text-muted-foreground">
        {totalRuns} run{totalRuns !== 1 ? "s" : ""}
      </span>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-2 py-1
              text-xs disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() =>
              update("page", String(currentPage - 1))
            }
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            className="rounded border px-2 py-1
              text-xs disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() =>
              update("page", String(currentPage + 1))
            }
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

**Step 4 — Render `RunsFilters`** in the page above the
runs table, passing current filter values and pagination.

### Constraints
- No schema changes
- The IngestTriggerClient and SchedulePanel must remain
  unchanged below the filters
- PAGE_SIZE = 50 (up from current 20)

**Commit:** `feat(runs): add venue filter, status filter, and pagination to ingest runs page`

---

## Task 4 — Venue Images ↔ Venue Onboarding cross-links
**Files:**
- `app/(admin)/admin/ingest/venue-images/venue-images-client.tsx`
- `app/(admin)/admin/ingest/venue-onboarding/venue-onboarding-client.tsx`
- `app/(admin)/admin/ingest/venue-onboarding/page.tsx`
**Effort:** ~25 min

### What to read first
```
cat app/(admin)/admin/ingest/venue-images/venue-images-client.tsx
cat app/(admin)/admin/ingest/venue-onboarding/venue-onboarding-client.tsx
cat app/(admin)/admin/ingest/venue-onboarding/page.tsx
```

### Changes to venue-images-client.tsx

After a cover image is successfully selected for a venue
(inside `selectCover` success handler), show a
"Continue to onboarding →" prompt for that venue:

Add state:
```ts
const [readyForOnboarding, setReadyForOnboarding] =
  useState<Set<string>>(new Set());
```

In the `selectCover` success handler, after updating
the venues state, add:
```ts
setReadyForOnboarding(prev =>
  new Set([...prev, venueId])
);
```

In the venue card render, after the image grid, add:
```tsx
{readyForOnboarding.has(venue.venueId) ? (
  <div className="mt-2 rounded border
    border-emerald-200 bg-emerald-50 px-3 py-2
    flex items-center justify-between">
    <span className="text-xs text-emerald-800">
      Cover set — venue ready to onboard
    </span>
    <a
      href="/admin/ingest/venue-onboarding"
      className="text-xs font-medium text-emerald-800
        underline"
    >
      Continue to onboarding →
    </a>
  </div>
) : null}
```

### Changes to venue-onboarding/page.tsx

Add a count of pending image candidates per venue so
the onboarding client can show image status.

Add to the venues select:
```ts
homepageImageCandidates: {
  where: { status: "pending" },
  select: { id: true },
},
```

### Changes to venue-onboarding-client.tsx

Update the `OnboardingVenue` type to include:
```ts
homepageImageCandidates: Array<{ id: string }>;
```

For each venue row, before the onboarding form trigger,
show image status:
```tsx
{venue.homepageImageCandidates.length > 0 ? (
  <span className="text-xs text-amber-700">
    {venue.homepageImageCandidates.length} image
    {venue.homepageImageCandidates.length !== 1
      ? "s" : ""} pending —{" "}
    <a
      href="/admin/ingest/venue-images"
      className="underline"
    >
      select cover first
    </a>
  </span>
) : (
  <span className="text-xs text-emerald-700">
    ✓ Images ready
  </span>
)}
```

Show this indicator next to the venue name in the
collapsed row, before the "Set up" / expand button.

### Constraints
- No API route changes
- No schema changes

**Commit:** `feat(ingest): add cross-links between venue images and venue onboarding`

---

## Task 5 — Stats header: visual priority for actionable metrics
**File:** `app/(admin)/admin/ingest/_components/ingest-shell-client.tsx`
**Effort:** ~20 min

### What to read first
```
cat app/(admin)/admin/ingest/_components/ingest-shell-client.tsx
```

### What to change

The 11-card stats grid treats all metrics identically.
Actionable metrics (things that need immediate attention)
should be visually distinct when non-zero.

**Step 1 — Classify metrics**

Actionable (red/amber tint when non-zero, link to action):
- Failed runs (24h) → links to `/admin/ingest/runs?status=FAILED`
- Pending images → links to `/admin/ingest/venue-images`
- Venues to onboard → links to `/admin/ingest/venue-onboarding`
- Artist candidates → links to `/admin/ingest/artists`
- Artwork candidates → links to `/admin/ingest/artworks`

Informational (never tinted, no urgency):
- Pending (total event candidates)
- High confidence
- Needs review
- Likely noise
- Active regions
- Venue gen (7d)

**Step 2 — Update the StatCard component** to accept an
optional `href` prop and an `urgent` boolean:

```ts
function StatCard({
  label, value, note, accentClassName, href, urgent,
}: {
  label: string;
  value: number;
  note: string;
  accentClassName?: string;
  href?: string;
  urgent?: boolean;
}) {
  const content = (
    <article className={`rounded-lg border
      bg-background p-3 transition-colors
      ${urgent && value > 0
        ? "border-amber-300 bg-amber-50/50"
        : ""}
      ${href ? "hover:bg-muted/40 cursor-pointer" : ""}
    `}>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold
        tabular-nums ${
          urgent && value > 0
            ? "text-amber-700"
            : accentClassName ?? "text-muted-foreground"
        }`}>
        {value}
      </p>
      <p className={`text-xs ${
        urgent && value > 0
          ? "text-amber-700"
          : accentClassName ?? "text-muted-foreground"
      }`}>
        {note}
      </p>
    </article>
  );
  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}
```

**Step 3 — Update the five actionable StatCard calls**
to pass `urgent={true}` and an `href`. Remove the
now-redundant `<Link>` wrappers around those cards
(the href prop handles navigation).

For example:
```tsx
<StatCard
  label="Failed runs (24h)"
  value={stats.failedLast24h}
  note={stats.failedLast24h > 0
    ? "Needs attention" : "No recent failures"}
  urgent={true}
  href="/admin/ingest/runs?status=FAILED"
/>
```

Apply the same pattern to: pending images, venues to
onboard, artist candidates, artwork candidates.

**Step 4 — Remove the existing `<Link>` wrappers** around
`StatCard` for Venues to onboard, Artist candidates,
Artwork candidates — they are now handled by `href` prop.

### Constraints
- No functional changes — only visual and navigation
- Informational cards (pending, high confidence, regions,
  venue gen) must NOT get urgent styling
- pnpm typecheck after

**Commit:** `feat(ingest): actionable stat cards tinted and linked, informational cards unchanged`
