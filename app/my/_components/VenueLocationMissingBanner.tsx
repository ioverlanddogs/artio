"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VenueLocationMissingBanner({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retryGeocode() {
    setIsLoading(true);
    setMessage(null);

    const response = await fetch(`/api/my/venues/${venueId}/geocode`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 422 && body?.code === "no_match") {
        setMessage("We couldn't match that address yet. Please check your address fields and retry.");
      } else {
        setMessage(body?.error?.message ?? "Unable to geocode venue location right now.");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="text-sm font-medium">Location missing — Nearby and maps won&apos;t work until we set it.</p>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="outline" onClick={retryGeocode} disabled={isLoading}>
          {isLoading ? "Trying…" : "Try geocode again"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
