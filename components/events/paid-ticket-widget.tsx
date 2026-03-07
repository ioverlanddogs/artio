"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amountMinor / 100);
}

export function PaidTicketWidget({ eventSlug, tiers }: { eventSlug: string; tiers: Tier[] }) {
  const activeTiers = useMemo(() => tiers, [tiers]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tierId: string) {
    setError(null);
    setIsSubmitting(tierId);

    const res = await fetch(`/api/events/${eventSlug}/checkout-session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tierId, guestName, guestEmail, quantity: 1 }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && body.url) {
      window.location.assign(body.url as string);
      return;
    }

    setError((body?.error?.message as string | undefined) ?? "Unable to start checkout.");
    setIsSubmitting(null);
  }

  return (
    <div className="space-y-3 rounded border p-4">
      <p className="text-sm font-medium">Buy tickets</p>
      <label className="block text-sm">Name<input className="mt-1 w-full rounded border p-2" value={guestName} onChange={(e) => setGuestName(e.target.value)} required /></label>
      <label className="block text-sm">Email<input className="mt-1 w-full rounded border p-2" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required /></label>

      <div className="space-y-2">
        {activeTiers.map((tier) => (
          <div key={tier.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{tier.name}</p>
                {tier.description ? <p className="text-xs text-muted-foreground">{tier.description}</p> : null}
              </div>
              <p className="text-sm font-semibold">{formatMoney(tier.priceAmount, tier.currency)}</p>
            </div>
            <Button
              type="button"
              className="mt-2"
              disabled={!guestName.trim() || !guestEmail.trim() || Boolean(isSubmitting)}
              onClick={() => void startCheckout(tier.id)}
            >
              {isSubmitting === tier.id ? "Redirecting..." : `Buy ${tier.name}`}
            </Button>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
