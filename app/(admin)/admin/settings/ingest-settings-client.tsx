"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type IngestSettingsProps = {
  initial: {
    ingestSystemPrompt: string | null;
    ingestModel: string | null;
    ingestMaxOutputTokens: number | null;
  };
};

const DEFAULT_PROMPT_PLACEHOLDER = [
  "You are extracting structured data from a venue website. Your output must contain",
  "two things: a list of upcoming events, and venue profile data observed from the same page.",
  "",
  "EVENTS",
  "Extract ONLY upcoming events (startAt in the future). Ignore navigation links,",
  "past events, and page furniture. For artistNames return only names clearly",
  "attributed to this event — do not include venue staff or sponsors.",
  "For imageUrl: find the image specific to THIS event — look first in any",
  "application/ld+json script blocks for an Event or ExhibitionEvent 'image'",
  "property, then in <img> tags adjacent to the event title or description,",
  "then in og:image meta tags only if the page covers a single event.",
  "Do NOT return the venue's global hero, banner, or logo image.",
  "If the src is relative, return it as-is — do not attempt to resolve it.",
  "If no event-specific image is found, return null.",
  "",
  "VENUE PROFILE",
  "Extract the following from the page. Only return values you are confident about —",
  "if unsure, return null. Do not invent values.",
  "venueDescription: A factual 1-3 sentence description of the venue. Null if insufficient.",
  "venueCoverImageUrl: Primary image of the venue itself — exterior, interior, or official",
  "venue image. Use og:image only if clearly a venue image not event-specific.",
  "Do not return event artwork. Return relative src as-is. Null if not found.",
  "venueOpeningHours: Opening hours as a plain string if present. Null if not found.",
  "venueContactEmail: General contact email visible on the page. Null if not found.",
  "venueInstagramUrl: Full https:// URL of the venue Instagram profile. Null if not found.",
  "venueFacebookUrl: Full https:// URL of the venue Facebook page. Null if not found.",
  "Return results in the provided schema.",
].join("\n");

export default function IngestSettingsClient(props: IngestSettingsProps) {
  const [prompt, setPrompt] = useState(props.initial.ingestSystemPrompt ?? "");
  const [model, setModel] = useState(props.initial.ingestModel ?? "");
  const [maxTokens, setMaxTokens] = useState(
    props.initial.ingestMaxOutputTokens !== null ? String(props.initial.ingestMaxOutputTokens) : "",
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      const parsedTokens = maxTokens.trim() ? Number.parseInt(maxTokens.trim(), 10) : null;
      const body = {
        ingestSystemPrompt: prompt.trim() || null,
        ingestModel: model.trim() || null,
        ingestMaxOutputTokens: Number.isFinite(parsedTokens) && parsedTokens! > 0 ? parsedTokens : null,
      };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrorMessage(data.error?.message ?? "Save failed.");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingestSystemPrompt: null,
          ingestModel: null,
          ingestMaxOutputTokens: null,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMessage("Reset failed.");
        return;
      }
      setPrompt("");
      setModel("");
      setMaxTokens("");
      setStatus("saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Ingest extraction</h2>
        <p className="text-sm text-muted-foreground">
          Overrides apply to all extraction runs. Leave blank to use hardcoded defaults.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="ingest-system-prompt">
          Extraction system prompt
        </label>
        <p className="text-xs text-muted-foreground">
          The static body of the system prompt sent to the model. The venue name, address, and today&apos;s date are
          always prepended automatically. Leave blank to use the built-in default.
        </p>
        <textarea
          id="ingest-system-prompt"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[240px] focus:outline-none focus:ring-2 focus:ring-ring"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setStatus("idle");
          }}
          placeholder={DEFAULT_PROMPT_PLACEHOLDER}
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="ingest-model">
          Model override
        </label>
        <p className="text-xs text-muted-foreground">
          OpenAI model identifier. Leave blank to use the <code>OPENAI_MODEL</code> env var or <code>gpt-4o-mini</code>.
        </p>
        <input
          id="ingest-model"
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setStatus("idle");
          }}
          placeholder="gpt-4o-mini"
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="ingest-max-tokens">
          Max output tokens
        </label>
        <p className="text-xs text-muted-foreground">
          Maximum tokens for the model response. Leave blank to use the default (4000).
        </p>
        <input
          id="ingest-max-tokens"
          type="number"
          min={1}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={maxTokens}
          onChange={(e) => {
            setMaxTokens(e.target.value);
            setStatus("idle");
          }}
          placeholder="4000"
          disabled={saving}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        <Button variant="outline" onClick={reset} disabled={saving}>
          Reset to defaults
        </Button>
      </div>

      {status === "saved" ? (
        <div className="rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </div>
      ) : null}
      {status === "error" ? (
        <div className="flex items-center justify-between rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          <span>{errorMessage ?? "An error occurred."}</span>
          <button type="button" onClick={() => setStatus("idle")}>
            ×
          </button>
        </div>
      ) : null}
    </section>
  );
}
