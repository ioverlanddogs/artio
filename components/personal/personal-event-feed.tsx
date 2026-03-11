"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import { ItemActionsMenu } from "@/components/personalization/item-actions-menu";
import { WhyThis } from "@/components/personalization/why-this";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/client";
import { buildExplanation } from "@/lib/personalization/explanations";
import { RANKING_VERSION, rankItems } from "@/lib/personalization/ranking";
import { getPreferenceSnapshot } from "@/lib/personalization/preferences";
import { recordFeedback } from "@/lib/personalization/feedback";
import { recordExposureBatch, recordOutcome } from "@/lib/personalization/measurement";
import { getOnboardingSignals, type OnboardingSignals } from "@/lib/onboarding/signals";

type FeedItem = {
  id: string;
  slug: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  venue?: { name: string | null; slug: string | null } | null;
};

const FEED_OPTIONS = [
  { value: "7", label: "Upcoming" },
  { value: "3", label: "This weekend" },
  { value: "30", label: "Newly added" },
] as const;

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

const debugEnabled = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PERSONALIZATION_DEBUG === "true";

export function PersonalEventFeed({
  items,
  selectedDays,
  selectedType,
  hasNoFollows,
}: {
  items: FeedItem[];
  selectedDays: "7" | "30";
  selectedType: "both" | "artist" | "venue";
  hasNoFollows: boolean;
}) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [signals, setSignals] = useState<OnboardingSignals>(emptySignals);

  useEffect(() => {
    void getOnboardingSignals().then((next) => setSignals(next));
  }, []);

  const rankedItems = useMemo(() => {
    const visible = items.filter((item) => !hiddenIds.includes(item.id));
    const seed = items.length + new Date().getDate();
    return rankItems(
      visible.map((item) => ({
        ...item,
        venueSlug: item.venue?.slug,
        sourceCategory: "follow" as const,
        entityType: "event" as const,
      })),
      {
        source: "following",
        signals: {
          followedVenueSlugs: signals.followedVenueSlugs,
          followedArtistSlugs: signals.followedArtistSlugs,
          hasLocation: signals.hasLocation,
        },
        preferences: getPreferenceSnapshot(),
        seed,
      },
    );
  }, [items, hiddenIds, signals]);

  useEffect(() => {
    if (!rankedItems.length) return;
    recordExposureBatch({
      source: "following",
      items: rankedItems.map((ranked, index) => ({
        itemType: "event",
        itemKey: `event:${ranked.item.slug ?? ranked.item.id}`.toLowerCase(),
        position: index,
        topReasonKind: ranked.topReason ?? "unknown",
        isExploration: ranked.breakdown.some((part) => part.key === "exploration"),
      })),
    });
    track("personalization_rank_applied", { rankingSource: "following", rankedCount: rankedItems.length, version: RANKING_VERSION });
    track("personalization_mix_applied", { source: "following", version: RANKING_VERSION });
    const explorationCount = rankedItems.filter((entry) => entry.breakdown.some((part) => part.key === "exploration")).length;
    if (explorationCount) track("personalization_exploration_inserted", { source: "following", count: explorationCount, rate: 0.2, version: RANKING_VERSION });
    if (rankedItems[0].topReason) track("personalization_top_reason", { rankingSource: "following", topReason: rankedItems[0].topReason, version: RANKING_VERSION });
    track("personalization_diversity_applied", { rankingSource: "following", diversityRules: "venue_top10<=2,tag_streak<=3,category_balance", version: RANKING_VERSION });
  }, [rankedItems]);

  if (hasNoFollows) {
    return (
      <EmptyState
        title="Your following feed is empty"
        description="Follow artists and venues to see their upcoming events here."
        actions={[{ label: "Browse artists", href: "/artists" }, { label: "Browse venues", href: "/venues" }]}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FEED_OPTIONS.map((option) => {
          const params = new URLSearchParams({ days: option.value === "3" ? "7" : option.value, type: selectedType });
          return (
            <Button key={option.value} asChild variant={selectedDays === params.get("days") ? "default" : "outline"} size="sm">
              <Link href={`/following?${params.toString()}`}>{option.label}</Link>
            </Button>
          );
        })}
      </div>
      {rankedItems.length === 0 ? (
        <EmptyState
          title="No upcoming events from people you follow"
          description="The artists and venues you follow don't have upcoming events listed yet."
          actions={[{ label: "Discover more", href: "/events" }]}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rankedItems.slice(0, 9).map((ranked) => {
            const item = ranked.item;
            const explanation = buildExplanation({
              item: {
                id: item.id,
                slug: item.slug,
                title: item.title,
                venueSlug: item.venue?.slug,
                venueName: item.venue?.name,
                source: "following",
                topReason: ranked.topReason ?? undefined,
              },
              contextSignals: { ...signals, source: "following", pathname: "/following" },
            });
            return (
              <li key={item.id} className="space-y-2">
                <EventCard
                  href={`/events/${item.slug}`}
                  title={item.title}
                  startAt={item.startAt}
                  endAt={item.endAt}
                  venueName={item.venue?.name ?? undefined}
                  secondaryText={debugEnabled ? `Score: ${ranked.score} • ${ranked.breakdown.map((entry) => `${entry.key}:${entry.value}`).join(", ")}` : undefined}
                  action={<ItemActionsMenu type="event" idOrSlug={item.slug} source="following" measurementSource="following" explanation={explanation} onHidden={() => setHiddenIds((current) => [...current, item.id])} />}
                  onOpen={() => {
                    recordFeedback({ type: "click", source: "following", item: { type: "event", idOrSlug: item.id, venueSlug: item.venue?.slug } });
                    recordOutcome({ action: "click", itemType: "event", itemKey: `event:${item.slug ?? item.id}`.toLowerCase(), sourceHint: "following" });
                  }}
                />
                {explanation ? <WhyThis source="following" explanation={explanation} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      {rankedItems.length > 9 ? <Link href={`/following?days=${selectedDays}&type=${selectedType}`} className="text-sm font-medium underline">See all events ({rankedItems.length})</Link> : null}
    </div>
  );
}
