"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SeoSettingsProps = {
  initial: {
    googleIndexingEnabled: boolean;
    googleServiceAccountJsonSet: boolean;
  };
};

export default function SeoSettingsClient(props: SeoSettingsProps) {
  const [googleIndexingEnabled, setGoogleIndexingEnabled] = useState(Boolean(props.initial.googleIndexingEnabled));
  const [googleServiceAccountJson, setGoogleServiceAccountJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleIndexingEnabled,
          googleServiceAccountJson: googleServiceAccountJson.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrorMessage(data.error?.message ?? "Save failed.");
        setStatus("error");
        return;
      }
      setStatus("saved");
      setGoogleServiceAccountJson("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">SEO &amp; Syndication</h2>
        <p className="text-sm text-muted-foreground">Configure Google Event indexing for published event URLs.</p>
      </div>

      <label className="flex items-center gap-2 text-sm" htmlFor="google-indexing-enabled">
        <input
          id="google-indexing-enabled"
          type="checkbox"
          checked={googleIndexingEnabled}
          onChange={(e) => {
            setGoogleIndexingEnabled(e.target.checked);
            setStatus("idle");
          }}
          disabled={saving}
        />
        Enable Google indexing API submissions
      </label>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="google-service-account-json">
          Google Service Account JSON
        </label>
        <textarea
          id="google-service-account-json"
          className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={googleServiceAccountJson}
          onChange={(e) => {
            setGoogleServiceAccountJson(e.target.value);
            setStatus("idle");
          }}
          placeholder={props.initial.googleServiceAccountJsonSet ? '{ "type": "service_account", ... } (stored)' : '{ "type": "service_account", ... }'}
          disabled={saving}
          autoComplete="off"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
      </div>

      {status === "saved" ? <div className="rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700">Settings saved.</div> : null}
      {status === "error" ? (
        <div className="flex items-center justify-between rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          <span>{errorMessage ?? "An error occurred."}</span>
          <button type="button" onClick={() => setStatus("idle")}>×</button>
        </div>
      ) : null}
    </section>
  );
}
