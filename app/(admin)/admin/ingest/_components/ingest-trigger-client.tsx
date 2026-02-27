"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineBanner } from "@/components/ui/inline-banner";

type VenueOption = {
  id: string;
  name: string;
  websiteUrl: string;
};

function getErrorMessage(status: number) {
  if (status === 400) return "This venue is missing a valid ingest source URL.";
  if (status === 401 || status === 403) return "You are not authorized to run ingest.";
  if (status === 404) return "Venue not found.";
  return "Could not start ingest run. Please try again.";
}

export default function IngestTriggerClient({ venues }: { venues: VenueOption[] }) {
  const router = useRouter();
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? "");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runExtraction() {
    if (!selectedVenueId || isRunning) return;
    setError(null);
    setIsRunning(true);

    try {
      const res = await fetch(`/api/admin/ingest/venues/${selectedVenueId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      if (!res.ok) {
        setError(getErrorMessage(res.status));
        return;
      }

      const payload = await res.json() as { runId: string };
      router.push(`/admin/ingest/runs/${payload.runId}`);
      router.refresh();
    } catch {
      setError("Could not start ingest run. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold">Trigger Extraction</h2>
        <p className="text-sm text-muted-foreground">Start a manual extraction run for a venue website.</p>
      </div>

      {error ? <InlineBanner>{error}</InlineBanner> : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 text-sm font-medium">
          Venue
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
            value={selectedVenueId}
            onChange={(event) => setSelectedVenueId(event.target.value)}
            disabled={isRunning || venues.length === 0}
          >
            {venues.length === 0 ? <option value="">No venues with website URL available</option> : null}
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={runExtraction} disabled={!selectedVenueId || isRunning}>
          {isRunning ? "Running…" : "Run Extraction"}
        </Button>
      </div>
    </section>
  );
}
