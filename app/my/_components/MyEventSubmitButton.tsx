"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { enqueueToast } from "@/lib/toast";

type SubmitEventForReviewParams = {
  eventId: string;
  fetchImpl?: typeof fetch;
};

type SubmitEventForReviewResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function submitEventForReviewRequest({ eventId, fetchImpl = fetch }: SubmitEventForReviewParams): Promise<SubmitEventForReviewResult> {
  const response = await fetchImpl(`/api/my/events/${eventId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (response.ok) return { ok: true };
  const body = await response.json().catch(() => ({}));
  return { ok: false, status: response.status, body };
}

export default function MyEventSubmitButton({ eventId, initialLabel = "Submit for review" }: { eventId: string; initialLabel?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitEventForReviewRequest({ eventId });
      if (!result.ok) {
        if (result.status === 401) {
          enqueueToast({ title: "Please log in", variant: "error" });
          window.location.href = buildLoginRedirectUrl("/my/events");
          return;
        }
        if (result.status === 409) {
          enqueueToast({ title: "Already submitted", variant: "error" });
          return;
        }
        enqueueToast({
          title: typeof result.body.message === "string" ? result.body.message : "Unable to submit event for review",
          variant: "error",
        });
        return;
      }

      enqueueToast({ title: "Submitted for review", variant: "success" });
      router.refresh();
    } catch {
      enqueueToast({ title: "Unable to submit event for review", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="link" className="h-auto p-0" onClick={onSubmit} disabled={submitting}>
      {submitting ? "Submitting…" : initialLabel}
    </Button>
  );
}
