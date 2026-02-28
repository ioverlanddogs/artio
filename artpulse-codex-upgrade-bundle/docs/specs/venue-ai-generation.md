# ArtPulse
## AI Venue Generation

Country + Region → OpenAI → Structured Venue Database

---

## What This System Does

An admin selects a **country** and **region** from the admin panel and clicks **Generate Venues**.

The system:

1. Sends a structured prompt to the OpenAI Responses API.
2. Requests a comprehensive list of art venues in the specified region:
   - Galleries
   - Museums
   - Art centres
   - Artist-run spaces
   - Sculpture parks
   - Foundations
3. Receives structured JSON (schema-enforced).
4. Normalises, deduplicates, and geocodes results.
5. Writes each result to the `Venue` table as:
   - `isPublished = false`
   - `aiGenerated = true`
   - `claimStatus = UNCLAIMED`

Generated venues are immediately:

- Eligible for event ingestion
- Visible in admin moderation
- Claimable by real-world venue owners

---

## Data Model Additions

New fields on `Venue`:

- `aiGenerated: Boolean`
- `aiGeneratedAt: DateTime?`
- `claimStatus: VenueClaimStatus` (`UNCLAIMED | PENDING | CLAIMED`)
- `contactPhone: String?`
- `openingHours: Json?`

New models:

- `VenueGenerationRun`

No changes to existing moderation models.

---

## OpenAI Generation Prompt

The prompt instructs the model to act as a **cultural directory researcher** with deep knowledge of the specified region.

The model must return:

- A strict JSON array
- Fully structured venue objects
- No commentary
- No markdown

Each object contains:

```json
{
  "name": "string",
  "addressLine1": "string | null",
  "addressLine2": "string | null",
  "city": "string | null",
  "region": "string | null",
  "postcode": "string | null",
  "country": "string",
  "contactEmail": "string | null",
  "contactPhone": "string | null",
  "websiteUrl": "string | null",
  "instagramUrl": "string | null",
  "openingHours": "string | null",
  "venueType": "GALLERY | MUSEUM | ART_CENTRE | FOUNDATION | OTHER"
}
```

---

## JSON Schema Enforcement

The OpenAI call uses:

- `response_format: { type: "json_schema" }`
- `strict: true`

This guarantees parseable output and keeps the ingest pipeline predictable.

---

## Generation Pipeline

Location:

- `lib/venue-generation/generation-pipeline.ts`

The pipeline runs synchronously within a single API request.

Typical runtime:

- 8–20 seconds
- 40–80 venues per run

For large regions, run in smaller batches (e.g., per province).

---

## Step-by-Step Pipeline

1. Validate country + region input.
2. Send structured OpenAI request.
3. Parse JSON response.
4. Normalise fields.
5. Deduplicate against existing venues.
6. Geocode address → lat/lng.
7. Insert non-duplicates.
8. Record generation run audit.
9. Return summary response.

---

## Deduplication Logic

A generated venue is considered a duplicate if:

- `normalize(name)` matches, and
- `normalize(city)` matches

(Exact string equality is not required.)

---

## Generation Run Audit Model

`VenueGenerationRun` tracks:

- country
- region
- totalReturned
- totalCreated
- totalSkipped
- triggeredBy (Admin user ID)
- createdAt

Used for:

- Admin visibility
- Debugging
- Future analytics

---

## Admin UI

New page:

- `/admin/venue-generation`

Components:

- Country selector (free-text + datalist)
- Region selector (free-text)
- Generate button (disabled while running)
- Spinner + runtime hint (“Typically 10–20 seconds”)
- Success banner (e.g. “73 venues created, 12 skipped”)
- Error banner with stable error code
- Recent runs table (last 10 runs)

---

## New API Routes

- `POST /api/admin/venue-generation`
- `GET /api/admin/venue-generation/runs`

Protected by:

- `requireAdmin()`
- `runtime = "nodejs"`
- `noStore()`

---

## Environment Variables

- `OPENAI_API_KEY`
- `VENUE_GENERATION_MODEL` (optional override)

---

## Quality & Limitations

- AI may hallucinate or include outdated contact info.
- Geocoding may fail for partial addresses.
- Synchronous execution may later be migrated to background jobs.
