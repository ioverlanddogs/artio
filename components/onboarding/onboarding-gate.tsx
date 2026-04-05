"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { getOnboardingState, getBannerMinimized, setBannerMinimized, setOnboardingCompleted, setOnboardingStep } from "@/lib/onboarding/state";
import { track } from "@/lib/analytics/client";
import type { OnboardingStepStatus } from "@/components/onboarding/onboarding-progress";
import { getOnboardingSignals, type OnboardingSignals } from "@/lib/onboarding/signals";

const COMPLETION_SESSION_KEY = "ap_onboarding_completion_seen";

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function OnboardingGate({ page, isAuthenticated }: { page: string; isAuthenticated: boolean }) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [signals, setSignals] = useState<OnboardingSignals>({ followsCount: 0, followedArtistSlugs: [], followedVenueSlugs: [], followedArtistNames: [], followedVenueNames: [], savedSearchesCount: 0, savedEventsCount: 0, hasLocation: false, radiusKm: 25 });
  const [showCompletion, setShowCompletion] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = getOnboardingState();
    setDismissed(stored.dismissed);
    setCompleted(stored.completed);
    setCompact(getBannerMinimized());
  }, []);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const nextSignals = await getOnboardingSignals(true);
      if (cancelled) return;
      setSignals(nextSignals);
      const completionMethod = nextSignals.followsCount >= 3 ? "follow" : nextSignals.savedSearchesCount >= 1 ? "saved_search" : nextSignals.savedEventsCount >= 1 ? "saved_event" : null;
      if (completionMethod && !completed) {
        setOnboardingCompleted(true);
        setOnboardingStep("done");
        setCompleted(true);
        track("onboarding_completed", { method: completionMethod });
      }
      if ((nextSignals.followsCount >= 1 || nextSignals.savedEventsCount >= 1) && !getBannerMinimized()) {
        setBannerMinimized(true);
        setCompact(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [completed, hydrated, isAuthenticated]);

  useEffect(() => {
    if (!completed) return;
    const session = getSessionStorage();
    if (session?.getItem(COMPLETION_SESSION_KEY) === "true") return;
    session?.setItem(COMPLETION_SESSION_KEY, "true");
    setShowCompletion(true);
  }, [completed]);

  const partialActivation = signals.followsCount >= 1 || signals.savedEventsCount >= 1;

  const steps = useMemo<OnboardingStepStatus[]>(() => ([
    { key: "follow", label: "Follow artists/venues", detail: `You're following ${signals.followsCount}`, done: signals.followsCount >= 3 },
    { key: "saved_search", label: "Save a search", detail: `Saved searches: ${signals.savedSearchesCount}`, done: signals.savedSearchesCount >= 1 },
    { key: "saved_event", label: "Save an event", detail: `Saved events: ${signals.savedEventsCount}`, done: signals.savedEventsCount >= 1 },
    { key: "location", label: "Enable nearby (optional)", detail: signals.hasLocation ? "Location is enabled" : "Nearby works when your device shares location", done: signals.hasLocation },
  ]), [signals]);

  if (!isAuthenticated) return null;
  if (!hydrated) return <Skeleton className="h-20 w-full" />;
  if (dismissed) return null;
  if (partialActivation && page !== "following") return null;

  if (completed) {
    if (!showCompletion) return null;
    return <OnboardingBanner page={page} compact={compact} steps={steps} onDismiss={() => setDismissed(true)} completionMessage="You're all set — nice work personalizing your feed. Next step: explore events picked for you." hasLocation={signals.hasLocation} isAuthenticated={isAuthenticated} />;
  }

  return <OnboardingBanner page={page} compact={compact || partialActivation} steps={steps} onDismiss={() => setDismissed(true)} hasLocation={signals.hasLocation} isAuthenticated={isAuthenticated} />;
}
