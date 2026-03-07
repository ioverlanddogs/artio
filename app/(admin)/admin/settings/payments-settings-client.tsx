"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PaymentsSettingsProps = {
  initial: {
    stripePublishableKey: string | null;
    stripeSecretKeySet: boolean;
    stripeWebhookSecretSet: boolean;
    platformFeePercent: number;
    googleIndexingEnabled: boolean;
    googleServiceAccountJsonSet: boolean;
  };
};

export default function PaymentsSettingsClient(props: PaymentsSettingsProps) {
  const [stripePublishableKey, setStripePublishableKey] = useState(props.initial.stripePublishableKey ?? "");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState(String(props.initial.platformFeePercent));
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
      const parsedPlatformFeePercent = Number.parseInt(platformFeePercent.trim(), 10);
      const body = {
        stripePublishableKey: stripePublishableKey.trim() || null,
        stripeSecretKey: stripeSecretKey.trim() || null,
        stripeWebhookSecret: stripeWebhookSecret.trim() || null,
        platformFeePercent:
          Number.isInteger(parsedPlatformFeePercent) && parsedPlatformFeePercent >= 1 && parsedPlatformFeePercent <= 100
            ? parsedPlatformFeePercent
            : null,
        googleIndexingEnabled,
        googleServiceAccountJson: googleServiceAccountJson.trim() || null,
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
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setGoogleServiceAccountJson("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Payments</h2>
        <p className="text-sm text-muted-foreground">Configure Stripe credentials and platform fee settings.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="stripe-publishable-key">
          Stripe Publishable Key
        </label>
        <input
          id="stripe-publishable-key"
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={stripePublishableKey}
          onChange={(e) => {
            setStripePublishableKey(e.target.value);
            setStatus("idle");
          }}
          placeholder="pk_live_..."
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="stripe-secret-key">
          Stripe Secret Key
        </label>
        <input
          id="stripe-secret-key"
          type="password"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={stripeSecretKey}
          onChange={(e) => {
            setStripeSecretKey(e.target.value);
            setStatus("idle");
          }}
          placeholder={props.initial.stripeSecretKeySet ? "•••••••• (stored)" : "sk_live_..."}
          disabled={saving}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="stripe-webhook-secret">
          Stripe Webhook Secret
        </label>
        <input
          id="stripe-webhook-secret"
          type="password"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={stripeWebhookSecret}
          onChange={(e) => {
            setStripeWebhookSecret(e.target.value);
            setStatus("idle");
          }}
          placeholder={props.initial.stripeWebhookSecretSet ? "•••••••• (stored)" : "whsec_..."}
          disabled={saving}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="platform-fee-percent">
          Platform Fee %
        </label>
        <input
          id="platform-fee-percent"
          type="number"
          min={1}
          max={100}
          step={1}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={platformFeePercent}
          onChange={(e) => {
            setPlatformFeePercent(e.target.value);
            setStatus("idle");
          }}
          placeholder="5"
          disabled={saving}
        />
      </div>


      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">SEO &amp; Syndication</h3>
          <p className="text-xs text-muted-foreground">Configure Google Event indexing for published event URLs.</p>
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
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
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
