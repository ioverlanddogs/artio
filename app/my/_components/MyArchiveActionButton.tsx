"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enqueueToast } from "@/lib/toast";

export function MyArchiveActionButton({ entityLabel, endpointBase, archived }: { entityLabel: string; endpointBase: string; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function run() {
    const action = archived ? "restore" : "archive";
    setBusy(true);
    setConfirming(false);
    try {
      const res = await fetch(`${endpointBase}/${action}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        enqueueToast({ title: body?.message ?? body?.error ?? `Failed to ${action} ${entityLabel}`, variant: "error" });
        return;
      }
      enqueueToast({ title: archived ? `${entityLabel} restored` : `${entityLabel} archived`, variant: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return confirming ? (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm">{archived ? "Restore?" : "Archive?"}</span>
      <button
        type="button"
        className="underline text-sm disabled:opacity-60"
        disabled={busy}
        onClick={() => void run()}
      >
        Yes
      </button>
      <button
        type="button"
        className="underline text-sm"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
    </span>
  ) : (
    <button
      type="button"
      className="underline disabled:opacity-60"
      disabled={busy}
      onClick={() => setConfirming(true)}
    >
      {busy ? "Working..." : archived ? "Restore" : "Archive"}
    </button>
  );
}
