"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BackfillVenueImagesTrigger() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function trigger() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/venues/backfill-images", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        processedVenues?: number;
        promoted?: number;
        failed?: number;
      };
      if (res.ok) {
        const parts: string[] = [];
        if (typeof data.processedVenues === "number")
          parts.push(`${data.processedVenues} venues checked`);
        if (typeof data.promoted === "number")
          parts.push(`${data.promoted} images set`);
        if (typeof data.failed === "number" && data.failed > 0)
          parts.push(`${data.failed} failed`);
        setResult(
          parts.length > 0
            ? `Backfill complete: ${parts.join(", ")}.`
            : "Backfill complete.",
        );
      } else {
        setResult("Backfill failed — check logs.");
      }
    } catch {
      setResult("Backfill failed — could not reach the server.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="space-y-2 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Backfill venue images</h2>
          <p className="text-sm text-muted-foreground">
            Promote the best available homepage image candidate for venues
            that have none set yet. Processes up to 50 venues.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void trigger()}
          disabled={running}
        >
          {running ? "Running…" : "Run backfill"}
        </Button>
      </div>
      {result ? (
        <p className="text-sm text-muted-foreground">{result}</p>
      ) : null}
    </section>
  );
}
