"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { enqueueToast } from "@/lib/toast";

type Result = { ok: true } | { ok: false; status: number; body: Record<string, unknown> };

export async function toggleDirectPublishRequest(url: string, fetchImpl: typeof fetch = fetch): Promise<Result> {
  const response = await fetchImpl(url, { method: "POST" });
  if (response.ok) return { ok: true };
  const body = await response.json().catch(() => ({}));
  return { ok: false, status: response.status, body };
}

export default function DirectPublishButton({
  endpoint,
  entityPath,
  nextPublished,
  disabled,
}: {
  endpoint: string;
  entityPath: string;
  nextPublished: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await toggleDirectPublishRequest(endpoint);
      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = buildLoginRedirectUrl(entityPath);
          return;
        }
        const errorMessage = (result.body as { error?: { message?: string }; message?: string } | undefined);
        const message = typeof errorMessage?.error?.message === "string"
          ? errorMessage.error.message
          : typeof errorMessage?.message === "string"
            ? errorMessage.message
            : nextPublished
              ? "Unable to publish right now."
              : "Unable to unpublish right now.";
        enqueueToast({ title: message, variant: "error" });
        return;
      }

      enqueueToast({ title: nextPublished ? "Published successfully." : "Unpublished successfully.", variant: "success" });
      router.refresh();
    } catch {
      enqueueToast({ title: nextPublished ? "Unable to publish right now." : "Unable to unpublish right now.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" onClick={onClick} disabled={busy || disabled} className="w-full">
      {busy ? (nextPublished ? "Publishing…" : "Unpublishing…") : (nextPublished ? "Publish" : "Unpublish")}
    </Button>
  );
}
