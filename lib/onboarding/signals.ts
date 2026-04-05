"use client";

type FollowItem = { slug?: string; name?: string };

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

let memoizedSignals: OnboardingSignals | null = null;
let memoizedAt = 0;
let inFlight: Promise<OnboardingSignals> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

function normalizeNames(items: FollowItem[] | undefined) {
  return (items ?? []).map((item) => item.name?.trim()).filter((value): value is string => Boolean(value));
}

export async function getOnboardingSignals(force = false): Promise<OnboardingSignals> {
  const now = Date.now();
  if (!force && memoizedSignals && now - memoizedAt < 60_000) return memoizedSignals;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    const [followsPayload, savedSearches, favorites, location] = await Promise.all([
      fetchJson<{ artists?: FollowItem[]; venues?: FollowItem[] }>("/api/follows/manage"),
      fetchJson<{ items?: unknown[] }>("/api/saved-searches"),
      fetchJson<{ items?: Array<{ targetType?: string }> }>("/api/favorites"),
      fetchJson<{ locationLabel?: string | null; lat?: number | null; lng?: number | null; radiusKm?: number | null }>("/api/me/location"),
    ]);

    const artists = followsPayload?.artists ?? [];
    const venues = followsPayload?.venues ?? [];

    const next: OnboardingSignals = {
      followsCount: artists.length + venues.length,
      followedArtistSlugs: artists.map((item) => item.slug?.trim()).filter((value): value is string => Boolean(value)),
      followedVenueSlugs: venues.map((item) => item.slug?.trim()).filter((value): value is string => Boolean(value)),
      followedArtistNames: normalizeNames(artists),
      followedVenueNames: normalizeNames(venues),
      savedSearchesCount: savedSearches?.items?.length ?? 0,
      savedEventsCount: (favorites?.items ?? []).filter((item) => item.targetType === "EVENT").length,
      hasLocation: Boolean(location?.locationLabel) || (typeof location?.lat === "number" && typeof location?.lng === "number"),
      radiusKm: typeof location?.radiusKm === "number" ? location.radiusKm : 25,
    };

    memoizedSignals = next;
    memoizedAt = Date.now();
    inFlight = null;
    return next;
  })();

  return inFlight.catch(() => {
    inFlight = null;
    return memoizedSignals ?? FALLBACK_SIGNALS;
  });
}

export type { OnboardingSignals };
