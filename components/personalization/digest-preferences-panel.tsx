"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

type DigestPreferencesPanelProps = {
  initial: {
    digestEventsOnly: boolean;
    digestMaxEvents: number;
    digestRadiusKm: number | null;
  };
};

export function DigestPreferencesPanel({ initial }: DigestPreferencesPanelProps) {
  const [includeArtworkUpdates, setIncludeArtworkUpdates] = useState(!initial.digestEventsOnly);
  const [maxEvents, setMaxEvents] = useState([5, 10, 20].includes(initial.digestMaxEvents) ? initial.digestMaxEvents : 10);
  const [radiusKm, setRadiusKm] = useState<number | null>(initial.digestRadiusKm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/me/digest-preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          digestEventsOnly: !includeArtworkUpdates,
          digestMaxEvents: maxEvents,
          digestRadiusKm: radiusKm,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setMessage("Saved digest preferences.");
    } catch {
      setMessage("Could not save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Digest preferences</h2>
      <div className="mt-4 grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Include artwork updates</p>
            <p className="text-xs text-muted-foreground">Turn off to receive event-only digests.</p>
          </div>
          <Switch checked={includeArtworkUpdates} onCheckedChange={setIncludeArtworkUpdates} disabled={isSaving} />
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Max events per digest</span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1"
            value={maxEvents}
            onChange={(event) => setMaxEvents(Number(event.target.value))}
            disabled={isSaving}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Nearby radius</span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1"
            value={radiusKm ?? "off"}
            onChange={(event) => setRadiusKm(event.target.value === "off" ? null : Number(event.target.value))}
            disabled={isSaving}
          >
            <option value="off">Off</option>
            <option value={5}>5km</option>
            <option value={10}>10km</option>
            <option value={25}>25km</option>
            <option value={50}>50km</option>
          </select>
        </label>

        <div className="flex items-center gap-3">
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void onSave()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save digest preferences"}
          </button>
          {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
