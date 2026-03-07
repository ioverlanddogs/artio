"use client";

import { useEffect, useState } from "react";

type Payload = {
  dailyCounts: Array<{ date: string; count: number }>;
  conversionRate: number;
  topEvents: Array<{ eventTitle: string; count: number }>;
};

export function RegistrationsAnalyticsSection() {
  const [data, setData] = useState<Payload>({ dailyCounts: [], conversionRate: 0, topEvents: [] });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/api/my/analytics/registrations", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && mounted) {
        setData({
          dailyCounts: Array.isArray(body.dailyCounts) ? body.dailyCounts : [],
          conversionRate: Number(body.conversionRate ?? 0),
          topEvents: Array.isArray(body.topEvents) ? body.topEvents : [],
        });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const max = Math.max(1, ...data.dailyCounts.map((item) => item.count));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">RSVPs</h2>
      <div className="rounded border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Confirmed RSVPs (last 30 days)</p>
        <div className="flex h-44 items-end gap-1">
          {data.dailyCounts.map((item) => (
            <div key={item.date} className="min-w-0 flex-1 rounded-sm bg-primary/20" style={{ height: `${Math.max(4, (item.count / max) * 100)}%` }} title={`${item.date}: ${item.count}`} />
          ))}
        </div>
      </div>

      <div className="rounded border p-3">
        <p className="text-xs text-muted-foreground">Conversion rate</p>
        <p className="text-2xl font-semibold">{(data.conversionRate * 100).toFixed(1)}%</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Top events</h3>
        {data.topEvents.length === 0 ? <p className="text-sm text-muted-foreground">No confirmed RSVPs in the last 30 days.</p> : (
          <ul className="space-y-2">
            {data.topEvents.map((item) => <li key={item.eventTitle} className="rounded border p-3 text-sm"><span className="font-medium">{item.eventTitle}</span> · {item.count}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
