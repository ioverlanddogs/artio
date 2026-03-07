"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 5 * 60;

export function ClaimVenueForm({ slug }: { slug: string }) {
  const [roleAtVenue, setRoleAtVenue] = useState("Owner");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailDeliveryActive, setEmailDeliveryActive] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendCooldownUntil) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setResendCooldownUntil(null);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [resendCooldownUntil]);

  const resendLabel = useMemo(() => {
    if (secondsLeft > 0) return `Resend available in ${secondsLeft}s`;
    return "Resend verification email";
  }, [secondsLeft]);

  return (
    <form
      className="space-y-3 rounded-lg border bg-background p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setStatus(null);
        setResendStatus(null);
        try {
          const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/claim`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ roleAtVenue, message }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error?.message ?? "Failed to submit claim");
          const isEmail = body.delivery === "EMAIL";
          setEmailDeliveryActive(isEmail);
          setStatus(isEmail ? "Claim submitted. Check the verification email." : "Claim submitted for manual review.");
        } catch (err) {
          setEmailDeliveryActive(false);
          setError(err instanceof Error ? err.message : "Failed to submit claim");
        }
      }}
    >
      <label className="block text-sm font-medium">Role at venue</label>
      <input className="w-full rounded-md border px-3 py-2 text-sm" value={roleAtVenue} onChange={(e) => setRoleAtVenue(e.target.value)} maxLength={80} required />
      <label className="block text-sm font-medium">Message (optional)</label>
      <textarea className="w-full rounded-md border px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} />
      <Button type="submit">Submit claim</Button>
      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {emailDeliveryActive ? (
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={secondsLeft > 0}
            onClick={async () => {
              setResendError(null);
              setResendStatus(null);
              const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/claim/resend`, { method: "POST" });
              const body = await response.json().catch(() => null);
              if (!response.ok) {
                setResendError(body?.error?.message ?? "Unable to resend verification email");
                return;
              }
              setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
              setResendStatus("Email sent.");
            }}
          >
            {resendLabel}
          </Button>
          {resendStatus ? <p className="text-sm text-emerald-700">{resendStatus}</p> : null}
          {resendError ? <p className="text-sm text-red-700">{resendError}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
