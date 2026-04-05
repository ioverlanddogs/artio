"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FollowButton } from "@/components/follows/follow-button";
import { ItemActionsMenu } from "@/components/personalization/item-actions-menu";
import { WhyThis } from "@/components/personalization/why-this";
import { RecommendedFollowsSkeleton } from "@/components/onboarding/recommended-follows-skeleton";
import { track } from "@/lib/analytics/client";
import { getOnboardingSignals, type OnboardingSignals } from "@/lib/onboarding/signals";
import { buildExplanation } from "@/lib/personalization/explanations";
import { rankItems } from "@/lib/personalization/ranking";
import { getPreferenceSnapshot } from "@/lib/personalization/preferences";
import { recordExposureBatch, recordOutcome } from "@/lib/personalization/measurement";

type RecommendationItem = {
  id: string;
  slug: string;
  name: string;
  followersCount: number;
  reason?: string;
  imageUrl?: string | null;
  subtitle?: string | null;
};

type RecommendationsPayload = {
  artists: RecommendationItem[];
  venues: RecommendationItem[];
};

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

export function RecommendedFollows({ page, source, isAuthenticated }: { page: string; source: string; isAuthenticated: boolean }) {
  const [tab, setTab] = useState<"artists" | "venues">("artists");
  const [data, setData] = useState<RecommendationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [signals, setSignals] = useState<OnboardingSignals>(emptySignals);

  useEffect(() => {
    void getOnboardingSignals().then((next) => setSignals(next));
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/recommendations/follows?limit=8", { cache: "no-store" });
        if (!res.ok) {
          setData({ artists: [], venues: [] });
          return;
        }
        const payload = (await res.json()) as RecommendationsPayload;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setData({ artists: [], venues: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const list = tab === "artists" ? data?.artists ?? [] : data?.venues ?? [];
    const visible = list.filter((item) => !hiddenIds.includes(item.id));
    const seed = list.length + new Date().getDate();
    return rankItems(visible.map((item) => ({
      ...item,
      title: item.name,
      entityType: tab === "artists" ? "artist" as const : "venue" as const,
      sourceCategory: "trending" as const,
    })), {
      source: "recommendations",
      signals: {
        followedArtistSlugs: signals.followedArtistSlugs,
        followedVenueSlugs: signals.followedVenueSlugs,
      },
      preferences: getPreferenceSnapshot(),
      seed,
    });
  }, [data, tab, hiddenIds, signals]);



  useEffect(() => {
    if (!items.length) return;
    recordExposureBatch({
      source: "recommended_follows",
      items: items.map((ranked, index) => ({
        itemType: tab === "artists" ? "artist" : "venue",
        itemKey: `${tab === "artists" ? "artist" : "venue"}:${ranked.item.slug ?? ranked.item.id}`.toLowerCase(),
        position: index,
        topReasonKind: ranked.topReason ?? "unknown",
        isExploration: ranked.breakdown.some((part) => part.key === "exploration"),
      })),
    });
  }, [items, tab]);
  useEffect(() => {
    if (loading || !data) return;
    track("recommended_follows_shown", { page, type: tab === "artists" ? "artist" : "venue" });
  }, [data, loading, page, tab]);

  if (loading) return <RecommendedFollowsSkeleton />;
  if (!data || (!data.artists.length && !data.venues.length)) return null;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border border-border p-1">
          <button type="button" className={`rounded px-2 py-1 text-sm ${tab === "artists" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setTab("artists")}>Artists</button>
          <button type="button" className={`rounded px-2 py-1 text-sm ${tab === "venues" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setTab("venues")}>Venues</button>
        </div>
        <Link href={tab === "artists" ? "/artists" : "/venues"} className="text-sm underline">See all</Link>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.slice(0, 6).map((ranked) => {
          const item = ranked.item;
          const href = tab === "artists" ? `/artists/${item.slug}` : `/venues/${item.slug}`;
          const explanation = buildExplanation({
            item: { id: item.id, slug: item.slug, title: item.name, type: tab === "artists" ? "artist" : "venue", source: "recommendations", topReason: ranked.topReason ?? undefined },
            contextSignals: { ...signals, source: "recommendations", pathname: "/following" },
          });
          return (
            <li key={item.id} className="rounded-lg border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs">{item.name.slice(0, 1)}</div>
                  <div>
                    <Link href={href} className="text-sm font-medium underline" onClick={() => recordOutcome({ action: "click", itemType: tab === "artists" ? "artist" : "venue", itemKey: `${tab === "artists" ? "artist" : "venue"}:${item.slug ?? item.id}`.toLowerCase(), sourceHint: "recommended_follows" })}>{item.name}</Link>
                    <p className="text-xs text-muted-foreground">{item.subtitle || item.reason || "Recommended"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <FollowButton
                    targetType={tab === "artists" ? "ARTIST" : "VENUE"}
                    targetId={item.id}
                    initialIsFollowing={false}
                    initialFollowersCount={item.followersCount ?? 0}
                    isAuthenticated={isAuthenticated}
                    analyticsSlug={item.slug}
                    personalizationSourceHint="recommended_follows"
                    onToggled={(nextState) => {
                      track("recommended_follow_clicked", { type: tab === "artists" ? "artist" : "venue", slug: item.slug, nextState, source });
                      if (nextState === "followed") {
                        recordOutcome({ action: "follow", itemType: tab === "artists" ? "artist" : "venue", itemKey: `${tab === "artists" ? "artist" : "venue"}:${item.slug ?? item.id}`.toLowerCase(), sourceHint: "recommended_follows" });
                      }
                    }}
                  />
                  <ItemActionsMenu type={tab === "artists" ? "artist" : "venue"} idOrSlug={item.slug} source="recommendations" explanation={explanation} onHidden={() => setHiddenIds((current) => [...current, item.id])} measurementSource="recommended_follows" />
                </div>
              </div>
              {explanation ? <div className="mt-2"><WhyThis source="recommendations" explanation={explanation} /></div> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
