"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EventRow } from "@/components/events/event-row";
import { ItemActionsMenu } from "@/components/personalization/item-actions-menu";
import { WhyThis } from "@/components/personalization/why-this";
import { SavedSearchesEmptyState } from "@/components/saved-searches/saved-searches-empty-state";
import { ErrorCard } from "@/components/ui/error-card";
import { LoadingCard } from "@/components/ui/loading-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enqueueToast } from "@/lib/toast";
import { track } from "@/lib/analytics/client";
import { getOnboardingSignals, type OnboardingSignals } from "@/lib/onboarding/signals";
import { buildExplanation } from "@/lib/personalization/explanations";
import { RANKING_VERSION, rankItems } from "@/lib/personalization/ranking";
import { getPreferenceSnapshot } from "@/lib/personalization/preferences";
import { recordFeedback } from "@/lib/personalization/feedback";
import { recordExposureBatch, recordOutcome } from "@/lib/personalization/measurement";

type SavedSearch = { id: string; name: string; type: "NEARBY" | "EVENTS_FILTER" | "ARTWORK"; frequency: "WEEKLY"; isEnabled: boolean; lastSentAt: string | null; createdAt?: string; paramsJson?: { q?: string; tags?: string[] } };
type RunItem = { id: string; slug: string; title: string; startAt: string; endAt: string | null; venue: { name: string | null } | null };


const emptySignals: OnboardingSignals = {
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

function humanTypeLabel(type: SavedSearch["type"]) {
  if (type === "NEARBY") return "Nearby events";
  if (type === "ARTWORK") return "Artwork filters";
  return "Search filters";
}

export function SavedSearchesClient() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [runMessages, setRunMessages] = useState<Record<string, string>>({});
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<RunItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [hiddenPreviewIds, setHiddenPreviewIds] = useState<string[]>([]);
  const [signals, setSignals] = useState<OnboardingSignals>(emptySignals);

  const load = async () => {
    setIsLoading(true);
    const res = await fetch("/api/saved-searches", { cache: "no-store" });
    if (!res.ok) {
      setLoadError("Unable to load saved searches right now.");
      setItems([]);
      setIsLoading(false);
      return;
    }
    const data = await res.json();
    setLoadError(null);
    setItems(data.items ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    track("saved_searches_viewed");
    void load();
    void getOnboardingSignals().then((next) => setSignals(next));
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = new Date(a.lastSentAt ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.lastSentAt ?? b.createdAt ?? 0).getTime();
      return bDate - aDate;
    });
  }, [items]);

  const previewVisibleItems = useMemo(() => {
    const activeSearch = items.find((item) => item.id === previewFor);
    const savedSearchQueries = activeSearch?.paramsJson?.q ? [activeSearch.paramsJson.q] : [];
    const savedSearchTags = activeSearch?.paramsJson?.tags ?? [];
    const visible = previewItems.filter((item) => !hiddenPreviewIds.includes(item.id));
    const seed = previewItems.length + new Date().getDate();
    return rankItems(visible.map((item) => ({
      ...item,
      title: item.title,
      entityType: "event" as const,
      sourceCategory: "trending" as const,
      tags: savedSearchTags,
      hasLocation: Boolean(item.venue?.name),
    })), {
      source: "saved_search_preview",
      signals: {
        followedArtistSlugs: signals.followedArtistSlugs,
        followedVenueSlugs: signals.followedVenueSlugs,
        savedSearchQueries,
        savedSearchTags,
        hasLocation: signals.hasLocation,
      },
      preferences: getPreferenceSnapshot(),
      seed,
    });
  }, [previewItems, hiddenPreviewIds, items, previewFor, signals]);


  useEffect(() => {
    if (!previewFor || !previewVisibleItems.length) return;
    recordExposureBatch({
      source: "saved_search_preview",
      items: previewVisibleItems.map((ranked, index) => ({
        itemType: "event",
        itemKey: `event:${ranked.item.slug ?? ranked.item.id}`.toLowerCase(),
        position: index,
        topReasonKind: ranked.topReason ?? "unknown",
        isExploration: ranked.breakdown.some((part) => part.key === "exploration"),
      })),
    });
    track("personalization_rank_applied", { rankingSource: "saved_search_preview", rankedCount: previewVisibleItems.length, version: RANKING_VERSION });
    track("personalization_mix_applied", { source: "saved_search_preview", version: RANKING_VERSION });
    const explorationCount = previewVisibleItems.filter((entry) => entry.breakdown.some((part) => part.key === "exploration")).length;
    if (explorationCount) track("personalization_exploration_inserted", { source: "saved_search_preview", count: explorationCount, rate: 0.2, version: RANKING_VERSION });
    if (previewVisibleItems[0].topReason) track("personalization_top_reason", { rankingSource: "saved_search_preview", topReason: previewVisibleItems[0].topReason, version: RANKING_VERSION });
    track("personalization_diversity_applied", { rankingSource: "saved_search_preview", diversityRules: "venue_top10<=2,tag_streak<=3,category_balance", version: RANKING_VERSION });
  }, [previewFor, previewVisibleItems]);

  const patchItem = async (id: string, updater: (item: SavedSearch) => SavedSearch, endpoint: string, body: unknown) => {
    const previous = items;
    setItems((current) => current.map((item) => item.id === id ? updater(item) : item));
    setSaving((current) => ({ ...current, [id]: true }));

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("request_failed");
    } catch {
      setItems(previous);
      enqueueToast({ title: "Unable to update saved search", variant: "error" });
    } finally {
      setSaving((current) => ({ ...current, [id]: false }));
    }
  };

  const runNow = async (id: string) => {
    setSaving((current) => ({ ...current, [id]: true }));
    setRunMessages((current) => ({ ...current, [id]: "Running now…" }));
    try {
      const response = await fetch(`/api/saved-searches/${id}/run?limit=6`, { cache: "no-store" });
      if (!response.ok) throw new Error("request_failed");
      const data = await response.json();
      track("saved_search_run_now", { savedSearchId: id });
      setRunMessages((current) => ({ ...current, [id]: `Found ${data.items?.length ?? 0} events right now.` }));
    } catch {
      setRunMessages((current) => ({ ...current, [id]: "Unable to run this search right now." }));
    } finally {
      setSaving((current) => ({ ...current, [id]: false }));
    }
  };



  const openPreview = async (id: string) => {
    setPreviewFor(id);
    track("saved_search_preview_opened", { savedSearchId: id });
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewItems([]);
    try {
      const response = await fetch(`/api/saved-searches/${id}/run?limit=12`, { cache: "no-store" });
      if (!response.ok) throw new Error("request_failed");
      const data = await response.json();
      setPreviewItems(data.items ?? []);
    } catch {
      setPreviewError("We couldn’t load your preview right now.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {loadError ? <ErrorCard message={loadError} onRetry={() => void load()} /> : null}
      {isLoading ? <div className="space-y-2" aria-busy="true"><LoadingCard lines={3} /><LoadingCard lines={3} /></div> : null}
      {!isLoading && !loadError && sortedItems.length === 0 ? <SavedSearchesEmptyState /> : null}

      <ul className="space-y-3" aria-busy={isLoading}>
        {sortedItems.map((item) => {
          const disabled = Boolean(saving[item.id]);
          const frequency = item.isEnabled ? "Weekly" : "Off";
          return (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {renamingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="rounded border border-border px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button className="rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={disabled} onClick={() => {
                        const next = renameValue.trim();
                        if (next.length < 2 || next.length > 60) return;
                        void patchItem(item.id, (current) => ({ ...current, name: next }), `/api/saved-searches/${item.id}/rename`, { name: next });
                        setRenamingId(null);
                      }}>Save</button>
                      <button className="rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => { setRenamingId(null); setRenameValue(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-foreground">{item.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{humanTypeLabel(item.type)} · Last sent {item.lastSentAt ? new Date(item.lastSentAt).toLocaleString() : "Never"}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-xs font-medium" title="Frequency controls how often digest updates are generated.">
                  {frequency}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.isEnabled}
                    disabled={disabled}
                    onChange={() => {
                      track("saved_search_toggled", { savedSearchId: item.id, nextState: item.isEnabled ? "disabled" : "enabled" });
                      void patchItem(item.id, (current) => ({ ...current, isEnabled: !current.isEnabled }), `/api/saved-searches/${item.id}/toggle`, { isEnabled: !item.isEnabled });
                    }}
                  />
                  Enabled
                </label>

                <select
                  className="rounded border border-border px-2 py-1 text-sm"
                  disabled={disabled}
                  value={item.isEnabled ? "WEEKLY" : "OFF"}
                  title="Choose Weekly to receive recurring digest updates, or Off to pause."
                  onChange={(event) => {
                    const next = event.target.value as "OFF" | "WEEKLY";
                    track("saved_search_frequency_changed", { savedSearchId: item.id, frequency: next });
                    void patchItem(item.id, (current) => ({ ...current, isEnabled: next === "WEEKLY" }), `/api/saved-searches/${item.id}/frequency`, { frequency: next });
                  }}
                >
                  <option value="OFF">Off</option>
                  <option value="WEEKLY">Weekly</option>
                </select>

                <button className="rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => { setRenamingId(item.id); setRenameValue(item.name); }} disabled={disabled}>Rename</button>
                <button className="rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => void openPreview(item.id)} disabled={disabled}>{disabled ? "Previewing..." : "Preview next digest"}</button>
                <button className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" title="Run now fetches matching events immediately without changing your schedule." onClick={() => void runNow(item.id)} disabled={disabled}>{disabled ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" /> : null}{disabled ? "Running..." : "Run now"}</button>
                <button className="rounded border border-red-300 px-2 py-1 text-sm text-red-700 ui-trans ui-press hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={async () => { await fetch(`/api/saved-searches/${item.id}`, { method: "DELETE" }); await load(); }}>Delete</button>
                <Link href={`/saved-searches/${item.id}`} className="rounded border border-border px-2 py-1 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Open</Link>
              </div>
              {runMessages[item.id] ? <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">{runMessages[item.id]}</p> : null}
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(previewFor)} onOpenChange={(isOpen) => !isOpen && setPreviewFor(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" aria-describedby="saved-search-preview-description">
          <DialogHeader>
            <DialogTitle>Next digest preview</DialogTitle>
            <DialogDescription id="saved-search-preview-description">A look at events currently matching this saved search.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {previewLoading ? <LoadingCard lines={2} /> : null}
            {previewError && previewFor ? <ErrorCard message={previewError} onRetry={() => void openPreview(previewFor)} /> : null}
            {!previewLoading && !previewError && previewVisibleItems.length === 0 ? <p className="text-sm text-muted-foreground">No events match right now — your digest will send when new matches appear.</p> : null}
            <ul className="space-y-2">
              {previewVisibleItems.map((ranked) => {
                const event = ranked.item;
                const explanation = buildExplanation({
                  item: { id: event.id, slug: event.slug, title: event.title, source: "saved_search_preview", tags: ["saved-search"], topReason: ranked.topReason ?? undefined },
                  contextSignals: { ...signals, source: "saved_search_preview", pathname: "/saved-searches" },
                });
                return (
                  <li key={event.id} className="space-y-1">
                    <EventRow
                      href={`/events/${event.slug}`}
                      title={event.title}
                      startAt={event.startAt}
                      endAt={event.endAt}
                      venueName={event.venue?.name}
                      action={<ItemActionsMenu type="event" idOrSlug={event.slug} source="saved_search_preview" measurementSource="saved_search_preview" explanation={explanation} onHidden={() => setHiddenPreviewIds((current) => [...current, event.id])} />}
                      onOpen={() => {
                        recordFeedback({ type: "click", source: "saved_search_preview", item: { type: "event", idOrSlug: event.id, tags: ["saved-search"] } });
                        recordOutcome({ action: "click", itemType: "event", itemKey: `event:${event.slug ?? event.id}`.toLowerCase(), sourceHint: "saved_search_preview" });
                      }}
                    />
                    {explanation ? <WhyThis source="saved_search_preview" explanation={explanation} /> : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href="/search" className="rounded border border-border px-3 py-1.5 text-sm ui-trans ui-press hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Adjust search</Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
