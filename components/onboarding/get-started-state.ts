"use client";

import { useCallback, useEffect, useState } from "react";
import { computeGetStartedProgress, type GetStartedProgress } from "@/lib/get-started";

type OnboardingApiPayload = {
  state?: {
    hasVisitedFollowing?: boolean;
    hasVisitedNearby?: boolean;
  };
  checklist?: Array<{ flag: string; done: boolean }>;
};

type FollowsApiPayload = {
  counts?: { total?: number };
};

type LocationApiPayload = {
  locationLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type SavedSearchesApiPayload = {
  items?: unknown[];
};

type GetStartedState = {
  loading: boolean;
  error: string | null;
  progress: GetStartedProgress | null;
};

function hasLocation(payload: LocationApiPayload | null): boolean {
  if (!payload) return false;
  if (typeof payload.locationLabel === "string" && payload.locationLabel.trim().length > 0) return true;
  return typeof payload.lat === "number" && typeof payload.lng === "number";
}

function hasFollowedFromChecklist(payload: OnboardingApiPayload | null): boolean {
  if (!payload?.checklist) return false;
  return payload.checklist.some((item) => item.flag === "hasFollowedSomething" && item.done);
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export function useGetStartedState() {
  const [state, setState] = useState<GetStartedState>({ loading: true, error: null, progress: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [onboarding, follows, location, savedSearches] = await Promise.all([
        fetchJson<OnboardingApiPayload>("/api/onboarding"),
        fetchJson<FollowsApiPayload>("/api/follows"),
        fetchJson<LocationApiPayload>("/api/me/location"),
        fetchJson<SavedSearchesApiPayload>("/api/saved-searches"),
      ]);

      const followed = (follows?.counts?.total ?? 0) > 0 || hasFollowedFromChecklist(onboarding);
      const progress = computeGetStartedProgress({
        hasFollowed: followed,
        hasLocation: hasLocation(location),
        hasSavedSearch: (savedSearches?.items?.length ?? 0) > 0,
        hasVisitedNearby: Boolean(onboarding?.state?.hasVisitedNearby),
        hasVisitedFollowing: Boolean(onboarding?.state?.hasVisitedFollowing),
      });

      setState({ loading: false, error: null, progress });
    } catch {
      setState({ loading: false, error: "Unable to load onboarding progress right now.", progress: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
