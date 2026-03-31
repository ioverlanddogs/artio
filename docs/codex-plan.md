# ARTIST_ARTWORK_SHOWCASE — Codex Agent Implementation Pack
> Feature: Option B — Full Artwork Showcase on Public Artist Profile  
> Repo: artio-demo-main  
> Stack: Next.js App Router · TypeScript · Prisma · Tailwind · shadcn/ui

---

## 0. AGENT RULES (read before anything else)

1. **Read before writing.** Before touching any file, `cat` it in full.  
2. **Match existing patterns exactly.** Tab system uses `components/entities/entity-tabs.tsx`. API routes follow the pattern in `app/api/artists/[slug]/route.ts`. Lib functions follow `lib/artists.ts`. Do not invent new patterns.  
3. **No schema changes.** All required fields exist. Do not add migrations.  
4. **Tests are required.** Every new lib function and API route needs a test file in `test/`. Match the style of `test/artists.test.ts` and `test/artwork-api-browse.test.ts`.  
5. **Keep CI green.** Run `pnpm test` and `pnpm build` mentally — if a change would break an existing import, fix it.  
6. **Commit in the order specified in Section 7.** Each commit is independently buildable.

---

## 1. CONTEXT — What exists today

### Public artist profile (`app/artists/[slug]/page.tsx`)
Currently renders:
- `<ArtistHeader>` — avatar, name, bio, follow button, social links
- `<EntityTabs>` — tabs for **Events** and **Venues**
- `<ArtistEventsViewTabs>` — under Events tab
- `<ArtistAssociatedVenuesSection>` — under Venues tab
- `<ArtistFeaturedArtworksPanel>` — rendered **outside** the tab system, as a static panel below the header

### What is missing
- No **Artworks tab** in the tab system  
- `ArtistFeaturedArtworksPanel` is a passive display with no filtering, no lightbox, no pagination  
- No per-artwork multi-image lightbox on the artist profile  
- No "For Sale" or tag filtering on the artist's portfolio  
- No dedicated API endpoint for fetching an artist's artworks with filters  

### Key existing files to read before starting

```
app/artists/[slug]/page.tsx          ← modify: add Artworks tab
app/artists/artists-client.tsx       ← read for client patterns
components/artists/
  artist-header.tsx                  ← read: understand ArtistHeader props
  artist-featured-artworks-panel.tsx ← read: will be replaced/extended
  artist-gallery-lightbox.tsx        ← read: copy lightbox pattern from here
  artist-events-view-tabs.tsx        ← read: copy tab content pattern
  artist-associated-venues-section.tsx ← read: copy section wrapper pattern
components/entities/
  entity-tabs.tsx                    ← READ FIRST: this is the tab system
  entity-card.tsx                    ← read: card pattern
components/artwork/
  artwork-related-section.tsx        ← read: existing artwork card markup
  artwork-count-badge.tsx            ← read: reuse for count display
lib/artists.ts                       ← modify: add getArtistArtworks()
lib/artworks.ts                      ← read: existing artwork query helpers
lib/artwork-slug.ts                  ← read: slug/key conventions
app/api/artists/[slug]/route.ts      ← read: copy route handler pattern
app/api/artwork/[key]/route.ts       ← read: copy artwork response shape
prisma/schema.prisma                 ← READ: confirm Artwork fields before querying
test/artists.test.ts                 ← read: copy test setup pattern
test/artwork-api-browse.test.ts      ← read: copy artwork test pattern
```

---

## 2. WHAT TO BUILD — Feature spec

### 2.1 New API endpoint
```
GET /api/artists/[slug]/artworks
```

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `tag` | string | — | filter by tag (exact match in tags array) |
| `forSale` | `"true"` | — | only artworks where `forSale = true` |
| `sort` | `"newest"` \| `"oldest"` \| `"az"` | `"newest"` | sort order |
| `limit` | number | `24` | max per page |
| `cursor` | string | — | cursor-based pagination (use `artwork.id`) |

**Response shape** (match existing `/api/artwork` response shape from `lib/artwork-route.ts`):
```ts
{
  artworks: ArtworkSummary[],
  nextCursor: string | null,
  total: number,
}
```

**ArtworkSummary** fields to include:
```ts
{
  id, key, title, year, medium, dimensions,
  forSale, price,          // include if fields exist on schema
  description,
  tags,
  featured,
  images: { id, url, isPrimary, order }[],  // ordered by `order` asc
  artist: { name, slug }   // for any cross-linking
}
```

**Auth:** Public. No authentication required. Only return `isPublished = true` artworks.

### 2.2 New lib function
```ts
// lib/artists.ts — add to existing file
export async function getArtistArtworks(
  slug: string,
  opts: {
    tag?: string;
    forSale?: boolean;
    sort?: "newest" | "oldest" | "az";
    limit?: number;
    cursor?: string;
  }
): Promise<{ artworks: ArtworkSummary[]; nextCursor: string | null; total: number }>
```

Query pattern — use the existing cursor predicate pattern from `lib/cursor-predicate.ts`.  
Follow the query structure in `lib/artworks.ts` for published-only filtering.

### 2.3 New components

#### A. `components/artists/artist-artwork-showcase.tsx`
Client component (`"use client"`). The main gallery section rendered inside the Artworks tab.

**Props:**
```ts
interface ArtistArtworkShowcaseProps {
  artistSlug: string;
  initialArtworks: ArtworkSummary[];
  initialNextCursor: string | null;
  totalCount: number;
  availableTags: string[]; // derived from all artist artworks, passed from server
}
```

**UI behaviour:**
- Filter bar: tag chips (pill buttons), "For sale only" checkbox, sort dropdown, grid/list toggle
- Featured works spotlight: if any artwork has `featured = true`, render them in a `FeaturedWorksStrip` at the top of the tab (above filter controls)
- Main grid: `artwork-showcase-card.tsx` in a responsive CSS grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- List view: stacked rows using `artwork-showcase-card.tsx` in list mode
- "Load more" button (cursor pagination, not infinite scroll — matches existing pattern in `artists-client.tsx`)
- Empty state: reuse `components/ui/empty-state.tsx`
- Loading state: reuse `components/entities/entity-card-skeleton.tsx` (3 × skeleton cards)
- On filter change: re-fetch from `/api/artists/[slug]/artworks` with new params; **do not reset cursor** until filters change
- Clicking any card or image opens `ArtistArtworkLightbox`

**State:**
```ts
const [artworks, setArtworks] = useState(initialArtworks);
const [cursor, setCursor] = useState(initialNextCursor);
const [filters, setFilters] = useState({ tag: "all", forSale: false, sort: "newest" });
const [view, setView] = useState<"grid" | "list">("grid");
const [lightbox, setLightbox] = useState<{ artwork: ArtworkSummary; imgIdx: number } | null>(null);
const [loading, setLoading] = useState(false);
```

#### B. `components/artists/artwork-showcase-card.tsx`
Supports two modes via a `view` prop.

**Props:**
```ts
interface ArtworkShowcaseCardProps {
  artwork: ArtworkSummary;
  view: "grid" | "list";
  onOpen: (artwork: ArtworkSummary, imgIdx?: number) => void;
}
```

**Grid mode:**
- Image fills top portion (aspect-ratio: 4/3), `object-fit: cover`
- On hover: overlay shows image count badge (if `images.length > 1`), "Featured" badge (if `artwork.featured`)
- Price badge top-right (if `forSale`)
- Below image: title (bold), year · medium (muted), description (2-line clamp), tag pills
- Entire card is clickable → `onOpen(artwork, 0)`
- Individual thumbnail images in a strip below (if `images.length > 1`) → `onOpen(artwork, i)`

**List mode:**
- Thumbnail left (120×90px), info right
- Title, year/medium/dimensions, 2-line description, tag pills, image count
- Price badge inline with title
- Entire row clickable

**Styling:** Use Tailwind only. Match the visual language of `entity-card.tsx` and `venue-event-showcase-card.tsx`.

#### C. `components/artists/artist-artwork-lightbox.tsx`
Full-screen lightbox for multi-image artwork viewing.

**Props:**
```ts
interface ArtistArtworkLightboxProps {
  artwork: ArtworkSummary;
  initialImgIdx: number;
  onClose: () => void;
  onNavigateArtwork?: (direction: "prev" | "next") => void; // for prev/next artwork
}
```

**Behaviour:**
- Keyboard: `Escape` → close, `ArrowLeft/Right` → prev/next image, `[` / `]` → prev/next artwork (if `onNavigateArtwork` provided)
- Dark overlay (`bg-black/95`), `fixed inset-0 z-50`
- Header: artwork title + medium, close button
- Main image: centred, `max-h-full max-w-full object-contain`
- Prev/next chevron buttons (only if `images.length > 1`)
- Thumbnail strip: clickable, highlights active
- Footer: dimensions | price + "Available" badge | "Not for sale" | image count `n / total`
- "Enquire about this work" CTA button (href: `mailto:` or link to artist website — use `artist.website` from context)
- Trap focus within modal (use `useEffect` to set focus on mount)
- `body` scroll lock on mount, restore on unmount

**Pattern to follow:** `components/artists/artist-gallery-lightbox.tsx` and `components/venues/venue-gallery-lightbox.tsx` — read both before writing.

#### D. `components/artists/featured-works-strip.tsx`
Simple spotlight strip shown above the filter controls.

**Props:**
```ts
interface FeaturedWorksStripProps {
  artworks: ArtworkSummary[]; // only featured ones
  onOpen: (artwork: ArtworkSummary) => void;
}
```

**UI:** Horizontal scroll rail (like `components/artwork/trending-rail.tsx`). Each item is a compact card: image, title, price badge. Section label "Featured Works" with a red accent (matches `components/artwork/trending-rail.tsx` heading style).  
Only render if `artworks.length > 0`.

### 2.4 Modify: `app/artists/[slug]/page.tsx`

**Current tab structure** (approximate — read the file before editing):
```tsx
<EntityTabs tabs={[
  { id: "events", label: `Events (${eventCount})` },
  { id: "venues", label: `Venues` },
]} />
```

**New tab structure:**
```tsx
<EntityTabs tabs={[
  { id: "artworks", label: `Artworks (${artworkTotal})` },  // ← ADD first
  { id: "events",   label: `Events (${eventCount})` },
  { id: "venues",   label: `Venues` },
]} />
```

**Data fetching** (server component):
```tsx
// Add alongside existing data fetches
const { artworks: initialArtworks, nextCursor, total: artworkTotal } =
  await getArtistArtworks(slug, { sort: "newest", limit: 24 });

// Derive available tags from ALL artist artworks (no filter)
const allArtworkTags = [...new Set(initialArtworks.flatMap(a => a.tags ?? []))];
```

**Artworks tab content:**
```tsx
{activeTab === "artworks" && (
  <ArtistArtworkShowcase
    artistSlug={slug}
    initialArtworks={initialArtworks}
    initialNextCursor={nextCursor}
    totalCount={artworkTotal}
    availableTags={allArtworkTags}
  />
)}
```

**Remove** the existing `<ArtistFeaturedArtworksPanel>` from outside the tab system — its functionality is now inside `ArtistArtworkShowcase`.

**Also update** the artist stats row in `<ArtistHeader>` (or inline before tabs) to show:
```tsx
<ArtworkCountBadge count={artworkTotal} forSaleCount={forSaleCount} />
```
(compute `forSaleCount` from `initialArtworks.filter(a => a.forSale).length` — or add a separate count query if needed for accuracy when `total > 24`)

### 2.5 Modify: `lib/artists.ts`

Add `getArtistArtworks()` function. Follow the query pattern of the existing `getArtist()` and `getArtistEvents()` functions in that file. Use `lib/cursor-predicate.ts` for pagination.

```ts
export async function getArtistArtworks(
  slug: string,
  opts: { tag?: string; forSale?: boolean; sort?: string; limit?: number; cursor?: string }
) {
  const limit = opts.limit ?? 24;
  const where = {
    isPublished: true,
    artist: { slug },
    ...(opts.tag ? { tags: { has: opts.tag } } : {}),
    ...(opts.forSale ? { forSale: true } : {}),
    ...(opts.cursor ? cursorPredicate(opts.cursor) : {}),
  };
  const orderBy = opts.sort === "oldest" ? { year: "asc" as const }
    : opts.sort === "az" ? { title: "asc" as const }
    : { year: "desc" as const };

  const [artworks, total] = await Promise.all([
    db.artwork.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: { images: { orderBy: { order: "asc" } } },
    }),
    db.artwork.count({ where: { isPublished: true, artist: { slug } } }),
  ]);

  const hasMore = artworks.length > limit;
  if (hasMore) artworks.pop();
  return {
    artworks,
    nextCursor: hasMore ? artworks[artworks.length - 1].id : null,
    total,
  };
}
```

> **Note:** Confirm exact Prisma field names against `prisma/schema.prisma` before writing. In particular verify: `forSale`, `price`, `year`, `medium`, `dimensions`, `tags`, `featured` on the `Artwork` model, and `order`, `isPrimary` on `ArtworkImage`.

### 2.6 New API route: `app/api/artists/[slug]/artworks/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getArtistArtworks } from "@/lib/artists";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = req.nextUrl;
  const result = await getArtistArtworks(params.slug, {
    tag: searchParams.get("tag") ?? undefined,
    forSale: searchParams.get("forSale") === "true",
    sort: (searchParams.get("sort") as any) ?? "newest",
    limit: Number(searchParams.get("limit") ?? 24),
    cursor: searchParams.get("cursor") ?? undefined,
  });
  return NextResponse.json(result);
}
```

Follow the exact error handling pattern from `app/api/artists/[slug]/route.ts` — read it first.

---

## 3. TYPES

Add to `lib/artworks.ts` or create `lib/artworks/types.ts` (check if a types file exists first):

```ts
export interface ArtworkImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface ArtworkSummary {
  id: string;
  key: string;
  title: string;
  year: number | null;
  medium: string | null;
  dimensions: string | null;
  forSale: boolean;
  price: string | null;
  description: string | null;
  tags: string[];
  featured: boolean;
  images: ArtworkImage[];
  artist: { name: string; slug: string };
}
```

> Check `lib/artworks.ts` first — some of these types may already be defined. Do not duplicate.

---

## 4. TESTS REQUIRED

### `test/artist-artwork-showcase-route.test.ts`
Test the new API route. Mirror `test/artists.test.ts` setup. Test cases:
- Returns 200 with artworks for a valid slug
- Filters by `tag` param correctly
- Filters by `forSale=true` correctly
- Respects `sort` param (newest, oldest, az)
- Returns only published artworks
- Returns 404 (or empty array) for unknown slug
- Cursor pagination returns correct subset and `nextCursor`

### `test/artist-artworks-lib.test.ts`
Unit tests for `getArtistArtworks()`. Mirror `test/artwork-api-browse.test.ts`. Test cases:
- Returns artworks for valid slug
- Excludes unpublished artworks
- Applies tag filter
- Applies forSale filter
- Returns correct `total` regardless of pagination
- Returns `nextCursor` when more results exist
- Returns `null` nextCursor on last page

### `test/artist-artwork-showcase-ui.test.ts`
UI smoke test. Mirror `test/artwork-browse-ui-smoke.test.ts`. Test cases:
- `ArtistArtworkShowcase` renders without error given mock props
- Renders grid cards
- Renders empty state when `initialArtworks = []`
- `ArtworkShowcaseCard` renders in grid mode
- `ArtworkShowcaseCard` renders in list mode
- `ArtistArtworkLightbox` renders and responds to Escape key

---

## 5. FILES SUMMARY

### New files
```
app/api/artists/[slug]/artworks/route.ts
components/artists/artist-artwork-showcase.tsx
components/artists/artwork-showcase-card.tsx
components/artists/artist-artwork-lightbox.tsx
components/artists/featured-works-strip.tsx
test/artist-artwork-showcase-route.test.ts
test/artist-artworks-lib.test.ts
test/artist-artwork-showcase-ui.test.ts
```

### Modified files
```
lib/artists.ts                         ← add getArtistArtworks()
app/artists/[slug]/page.tsx            ← add Artworks tab, remove old panel
```

### Files to read but NOT modify
```
prisma/schema.prisma                   ← read to confirm field names
components/entities/entity-tabs.tsx    ← read to use correctly
components/artists/artist-gallery-lightbox.tsx    ← pattern reference
components/venues/venue-gallery-lightbox.tsx      ← pattern reference
components/artists/artist-featured-artworks-panel.tsx  ← understand what you're replacing
components/artwork/trending-rail.tsx   ← pattern for FeaturedWorksStrip
lib/artworks.ts                        ← read before adding types
lib/cursor-predicate.ts               ← read before implementing pagination
lib/artwork-route.ts                  ← read to match response shape
```

---

## 6. DEFINITION OF DONE

- [ ] `GET /api/artists/[slug]/artworks` returns filtered, paginated, published artworks
- [ ] Public artist profile has Artworks tab as first tab
- [ ] Grid view shows artwork cards with image, title, year/medium, description preview, tags, price badge
- [ ] List view shows compact rows with thumbnail
- [ ] Featured works strip renders above filter bar (when `featured` artworks exist)
- [ ] Tag filter chips update the artwork list (client-side fetch, no page reload)
- [ ] "For sale only" toggle filters correctly
- [ ] Sort dropdown (newest / oldest / A–Z) works
- [ ] Grid/list toggle works
- [ ] "Load more" button loads next page via cursor
- [ ] Clicking a card opens the lightbox
- [ ] Lightbox shows all images for the artwork with thumbnail strip
- [ ] Lightbox keyboard nav: Escape closes, Arrow keys navigate images
- [ ] Lightbox footer shows dimensions, price/availability, image count
- [ ] "Enquire" CTA in lightbox links to artist website or mailto
- [ ] `ArtistFeaturedArtworksPanel` is removed from outside-tab position
- [ ] Artist stats row shows artwork count and for-sale count
- [ ] All 3 test files pass
- [ ] `pnpm build` passes with no type errors
- [ ] No regressions on existing artist page tests (`test/artists.test.ts`, `test/artist-publish.test.ts`)

---

## 7. COMMIT ORDER

```
feat: add getArtistArtworks() to lib/artists.ts
feat: add GET /api/artists/[slug]/artworks route
feat: add artwork-showcase-card component (grid + list modes)
feat: add artist-artwork-lightbox component
feat: add featured-works-strip component
feat: add artist-artwork-showcase container component
feat: integrate artworks tab into artist profile page
test: artist artwork showcase route, lib, and UI tests
```

---

## 8. AGENT PROMPT

Copy the block below verbatim as your Codex prompt:

---

```
You are implementing the ARTIST_ARTWORK_SHOWCASE feature for the artio-demo-main Next.js repository.

Full implementation spec is in this handoff document. Follow every instruction exactly.

BEFORE WRITING ANY CODE:
1. cat prisma/schema.prisma and note the exact field names on Artwork and ArtworkImage models
2. cat lib/artists.ts in full
3. cat lib/artworks.ts in full
4. cat lib/cursor-predicate.ts in full
5. cat app/artists/[slug]/page.tsx in full
6. cat components/entities/entity-tabs.tsx in full
7. cat components/artists/artist-gallery-lightbox.tsx in full
8. cat components/venues/venue-gallery-lightbox.tsx in full
9. cat components/artists/artist-featured-artworks-panel.tsx in full
10. cat components/artwork/trending-rail.tsx in full
11. cat app/api/artists/[slug]/route.ts in full
12. cat lib/artwork-route.ts in full
13. cat test/artists.test.ts in full
14. cat test/artwork-api-browse.test.ts in full

Only begin implementation after reading all 14 files.

IMPLEMENTATION ORDER (one commit per step, all CI must pass before next step):

Step 1 — lib/artists.ts
Add getArtistArtworks(slug, opts) following the exact query patterns you read. Use cursor-predicate.ts for pagination. Match field names exactly from schema.prisma. Export the ArtworkSummary type or confirm it already exists in lib/artworks.ts.

Step 2 — app/api/artists/[slug]/artworks/route.ts
New file. Follow the error handling and response shape of app/api/artists/[slug]/route.ts exactly. Public GET only. Parse query params: tag, forSale, sort, limit, cursor. Call getArtistArtworks(). Return NextResponse.json(result).

Step 3 — components/artists/artwork-showcase-card.tsx
New file. Grid mode and list mode controlled by view prop. Grid: image top (aspect-ratio 4/3, object-fit cover), hover overlay with image count and featured badge, price badge top-right, title/year/medium/description/tags below. List: thumbnail left (120×90), info right. Use Tailwind only. No inline styles. Match entity-card.tsx visual language.

Step 4 — components/artists/artist-artwork-lightbox.tsx
New file. Full-screen modal (fixed inset-0 z-50 bg-black/95). Header: title + medium + close button. Main: centred image (max-h-full max-w-full object-contain). Prev/next chevrons if multiple images. Thumbnail strip. Footer: dimensions, price/Available badge or "Not for sale", image count. "Enquire" link. Keyboard: Escape=close, ArrowLeft/Right=navigate images. Body scroll lock. Follow artist-gallery-lightbox.tsx patterns exactly.

Step 5 — components/artists/featured-works-strip.tsx
New file. Horizontal scroll rail. Section label "Featured Works" with red accent. Each item: square image crop + title + price badge. Clicking opens lightbox. Match trending-rail.tsx structure and heading style. Only render when artworks.length > 0.

Step 6 — components/artists/artist-artwork-showcase.tsx
New file. "use client". Props: artistSlug, initialArtworks, initialNextCursor, totalCount, availableTags. State: filters (tag/forSale/sort), view (grid/list), artworks, cursor, loading, lightbox. On filter change: reset cursor, fetch /api/artists/[slug]/artworks with new params. Load more: append results, update cursor. Render: FeaturedWorksStrip (if featured works exist) → filter bar → grid or list of ArtworkShowcaseCards → load more button. Open ArtistArtworkLightbox on card click.

Step 7 — app/artists/[slug]/page.tsx
Read the file fully first. Add getArtistArtworks() call alongside existing data fetches. Compute allArtworkTags from initialArtworks. Add Artworks tab as first tab in EntityTabs. Add ArtistArtworkShowcase under artworks tab. Remove ArtistFeaturedArtworksPanel from its current outside-tab position. Add artwork count + for-sale count to the artist stats display.

Step 8 — Tests
Write test/artist-artwork-showcase-route.test.ts, test/artist-artworks-lib.test.ts, test/artist-artwork-showcase-ui.test.ts. Follow test/artists.test.ts setup exactly. All cases listed in the spec must be covered.

CONSTRAINTS:
- TypeScript strict mode. No `any` except where already present in surrounding code.
- Tailwind only for new components. No inline styles.
- No new Prisma migrations.
- No new npm packages unless already in package.json.
- All new components must be exported as named exports (not default) unless the file is a page.tsx.
- Match the existing ESLint config (eslint.config.mjs). Do not introduce lint errors.
- The Artworks tab must be the first (leftmost) tab on the artist profile.
- Only published artworks (isPublished: true) may appear publicly.

Run pnpm test and pnpm build after each step. Fix any errors before proceeding.
```
