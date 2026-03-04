"use client";

import { useEffect, useState } from "react";

type Props = {
  eventId: string;
};

type EventAnalyticsPayload = {
  totalViews: number;
  last7DaysViews: number;
  last30DaysViews: number;
  saves: number;
};

export default function EventAnalyticsSummary({ eventId }: Props) {
  const [data, setData] = useState<EventAnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const res = await fetch(`/api/my/events/${eventId}/analytics`, { cache: "no-store" });
      const body = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setData(null);
        setError(body?.error?.message ?? "Failed to load event analytics");
        return;
      }

      setData(body as EventAnalyticsPayload);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Event analytics</h2>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Views (7d)</p><p className="text-2xl font-semibold">{data.last7DaysViews}</p></div>
          <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Views (30d)</p><p className="text-2xl font-semibold">{data.last30DaysViews}</p></div>
          <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Total views</p><p className="text-2xl font-semibold">{data.totalViews}</p></div>
          <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Saves</p><p className="text-2xl font-semibold">{data.saves}</p></div>
        </div>
      )}
    </section>
  );
}
