"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
};

export function RequestPublisherAccessCard({ email }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string>("");

  async function onRequestAccess() {
    setIsSubmitting(true);
    setResult("");
    try {
      const response = await fetch("/api/beta/request-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, note: "publisher_dashboard" }),
      });
      setResult(response.ok ? "Request sent. We will review it soon." : "Could not send request right now.");
    } catch {
      setResult("Could not send request right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Request Publisher Access</h2>
      <p className="mt-1 text-sm text-muted-foreground">Need publishing tools? Request access and an editor/admin can approve your account.</p>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onClick={onRequestAccess} disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Request Publisher Access"}</Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">{result}</p>
      </div>
    </section>
  );
}
