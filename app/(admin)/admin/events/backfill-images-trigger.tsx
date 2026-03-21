"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BackfillEventImagesTrigger() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function trigger() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/ingest/backfill-event-images", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        processedEvents?: number;
        attached?: number;
        skipped?: number;
        failed?: number;
      };
      if (res.ok) {
        const parts: string[] = [];
        if (typeof data.processedEvents === "number")
          parts.push(`${data.processedEvents} events checked`);
        if (typeof data.attached === "number")
          parts.push(`${data.attached} images imported`);
        if (typeof data.skipped === "number" && data.skipped > 0)
          parts.push(`${data.skipped} skipped`);
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
          <h2 className="text-base font-semibold">Backfill event images</h2>
          <p className="text-sm text-muted-foreground">
            Import images for published events that have none. Re-runs image
            discovery using each event&apos;s original ingest source URL. Processes
            up to 50 events.
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
