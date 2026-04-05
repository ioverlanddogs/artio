# Fix: Location save strips user's radius — 3 targeted changes across 2 files

Apply all three fixes below in order. Do not change any other code.
After applying all fixes, run `pnpm typecheck` and `pnpm lint` and correct any errors introduced.

---

## Context

When a user grants geolocation from the for-you feed prompt, `for-you-client.tsx` sends only
`{ lat, lng }` to `PUT /api/me/location`. The `locationPreferenceSchema` in `lib/validators.ts`
defaults `radiusKm` to `25` when the field is absent. This silently overwrites whatever radius
the user previously set via the account page with a hardcoded 25 km on every location prompt
acceptance.

The fix is to read the user's existing `radiusKm` from the signals object (which already fetches
`/api/me/location`) and include it in the PUT payload. This requires three changes:

1. Add `radiusKm` to the `OnboardingSignals` type and populate it in `getOnboardingSignals`.
2. Include `radiusKm` in the geolocation PUT payload in `for-you-client.tsx`.
3. Update `setSignals` after the PUT succeeds so the in-memory signals stay consistent.

---

## Fix 1 — `lib/onboarding/signals.ts`

### Bug
`OnboardingSignals` has no `radiusKm` field. The signal fetcher already calls `/api/me/location`
which returns `{ locationLabel, lat, lng, radiusKm }`, but `radiusKm` is discarded. The
`for-you-client` cannot read the user's saved radius without it.

### Change

**Step A** — add `radiusKm` to the `OnboardingSignals` type:

```ts
// BEFORE
type OnboardingSignals = {
  followsCount: number;
  followedArtistSlugs: string[];
  followedVenueSlugs: string[];
  followedArtistNames: string[];
  followedVenueNames: string[];
  savedSearchesCount: number;
  savedEventsCount: number;
  hasLocation: boolean;
};

// AFTER
type OnboardingSignals = {
  followsCount: number;
  followedArtistSlugs: string[];
  followedVenueSlugs: string[];
  followedArtistNames: string[];
  followedVenueNames: string[];
  savedSearchesCount: number;
  savedEventsCount: number;
  hasLocation: boolean;
  radiusKm: number;
};
```

**Step B** — add `radiusKm` to `FALLBACK_SIGNALS`:

```ts
// BEFORE
const FALLBACK_SIGNALS: OnboardingSignals = {
  followsCount: 0,
  followedArtistSlugs: [],
  followedVenueSlugs: [],
  followedArtistNames: [],
  followedVenueNames: [],
  savedSearchesCount: 0,
  savedEventsCount: 0,
  hasLocation: false,
};

// AFTER
const FALLBACK_SIGNALS: OnboardingSignals = {
  followsCount: 0,
  followedArtistSlugs: [],
  followedVenueSlugs: [],
  followedArtistNames: [],
  followedVenueNames: [],
  savedSearchesCount: 0,
  savedEventsCount: 0,
  hasLocation: false,
  radiusKm: 25,
};
```

**Step C** — update the `fetchJson` call for location to include `radiusKm` in the type,
and populate it when building the `next` signals object.

The existing location fetch type is:
```ts
fetchJson<{ locationLabel?: string | null; lat?: number | null; lng?: number | null }>("/api/me/location"),
```

Change it to:
```ts
fetchJson<{ locationLabel?: string | null; lat?: number | null; lng?: number | null; radiusKm?: number | null }>("/api/me/location"),
```

Then in the `next` object construction, add `radiusKm` after `hasLocation`:

```ts
// BEFORE
      hasLocation: Boolean(location?.locationLabel) || (typeof location?.lat === "number" && typeof location?.lng === "number"),

// AFTER
      hasLocation: Boolean(location?.locationLabel) || (typeof location?.lat === "number" && typeof location?.lng === "number"),
      radiusKm: typeof location?.radiusKm === "number" && location.radiusKm > 0 ? location.radiusKm : 25,
```

---

## Fix 2 — `components/recommendations/for-you-client.tsx` — geolocation payload

### Bug
The geolocation success handler sends only `{ lat, lng }`, which causes the server to default
`radiusKm` to 25, overwriting whatever the user had configured.

### Change

The geolocation handler currently reads:

```ts
      async (position) => {
        const payload = { lat: position.coords.latitude, lng: position.coords.longitude };

        try {
          const response = await fetch("/api/me/location", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error("location_update_failed");
          }

          setSignals((current) => ({ ...current, hasLocation: true }));
          setLocationPromptError(null);
        } catch {
          setLocationPromptError("Could not detect location. Set it manually.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
```

Replace it with:

```ts
      async (position) => {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radiusKm: signals.radiusKm > 0 ? signals.radiusKm : 25,
        };

        try {
          const response = await fetch("/api/me/location", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error("location_update_failed");
          }

          setSignals((current) => ({ ...current, hasLocation: true, radiusKm: payload.radiusKm }));
          setLocationPromptError(null);
        } catch {
          setLocationPromptError("Could not detect location. Set it manually.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
```

The only changes are:
- `payload` now includes `radiusKm` read from the current `signals` object.
- `setSignals` now also updates `radiusKm` in the in-memory signals so subsequent reads
  are consistent without a refetch.

---

## Fix 3 — `components/recommendations/for-you-client.tsx` — emptySignals default

### Bug
`emptySignals` is the initial state before signals are loaded. It does not include `radiusKm`,
which will now be a required field on `OnboardingSignals` after Fix 1. TypeScript will error.

### Change

Find the `emptySignals` constant:

```ts
const emptySignals: OnboardingSignals = {
  followsCount: 0,
  followedArtistSlugs: [],
  followedVenueSlugs: [],
  followedArtistNames: [],
  followedVenueNames: [],
  savedEventsCount: 0,
  savedSearchesCount: 0,
  hasLocation: false,
};
```

Add `radiusKm: 25` to it:

```ts
const emptySignals: OnboardingSignals = {
  followsCount: 0,
  followedArtistSlugs: [],
  followedVenueSlugs: [],
  followedArtistNames: [],
  followedVenueNames: [],
  savedEventsCount: 0,
  savedSearchesCount: 0,
  hasLocation: false,
  radiusKm: 25,
};
```

---

## Verification

After applying all three fixes, confirm:

1. `pnpm typecheck` passes with no new errors.
2. `pnpm lint` passes with no new errors.
3. In `lib/onboarding/signals.ts`:
   - `OnboardingSignals` type has `radiusKm: number`.
   - `FALLBACK_SIGNALS` has `radiusKm: 25`.
   - The location `fetchJson` type includes `radiusKm?: number | null`.
   - The `next` object sets `radiusKm` from the location response, defaulting to 25.
4. In `components/recommendations/for-you-client.tsx`:
   - The geolocation `payload` includes `radiusKm: signals.radiusKm > 0 ? signals.radiusKm : 25`.
   - `setSignals` after the PUT includes `radiusKm: payload.radiusKm`.
   - `emptySignals` has `radiusKm: 25`.
5. No other files are modified.

Output a summary listing each file changed and the exact lines modified.
