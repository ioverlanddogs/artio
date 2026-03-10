"use client";

import { useCallback, useEffect, useState } from "react";
import { enqueueToast } from "@/lib/toast";

type VenueEnrichmentLog = {
  id: string;
  createdAt: string;
  changedFields: string[];
  before: unknown;
  after: unknown;
  runId: string;
};

export default function VenueEnrichmentLogPanel({ venueId }: { venueId: string }) {
  const [logs, setLogs] = useState<VenueEnrichmentLog[] | null>(null);
  const [busyLogId, setBusyLogId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    const response = await fetch(`/api/admin/venues/${venueId}/enrichment-log`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load enrichment logs");
    }

    const body = (await response.json()) as { logs?: VenueEnrichmentLog[] };
    setLogs(body.logs ?? []);
  }, [venueId]);

  useEffect(() => {
    loadLogs().catch(() => {
      enqueueToast({ title: "Failed to load enrichment history", variant: "error" });
      setLogs([]);
    });
  }, [loadLogs]);

  async function revertLog(logId: string) {
    setBusyLogId(logId);
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/enrichment-log/${logId}/revert`, {
        method: "POST",
      });

      if (!response.ok) {
        enqueueToast({ title: "Revert failed", message: "Please try again.", variant: "error" });
        return;
      }

      enqueueToast({ title: "Enrichment changes reverted" });
      await loadLogs();
    } catch {
      enqueueToast({ title: "Revert failed", message: "Please try again.", variant: "error" });
    } finally {
      setBusyLogId(null);
    }
  }

  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-background p-4">
      <details>
        <summary className="cursor-pointer text-base font-semibold">Enrichment history ({logs.length} entries)</summary>
        <div className="mt-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                <button
                  type="button"
                  className="text-sm underline disabled:text-muted-foreground"
                  onClick={() => void revertLog(log.id)}
                  disabled={busyLogId === log.id}
                >
                  {busyLogId === log.id ? "Reverting…" : "Revert"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {log.changedFields.map((field) => (
                  <span key={`${log.id}-${field}`} className="rounded-full border px-2 py-0.5 text-xs">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
