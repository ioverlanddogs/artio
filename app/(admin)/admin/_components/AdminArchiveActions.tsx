"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enqueueToast } from "@/lib/toast";

export function AdminArchiveActions({ entity, id, archived }: { entity: "events" | "venues" | "artists" | "artwork"; id: string; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const action = archived ? "restore" : "archive";

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/admin/${entity}/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: archived ? undefined : JSON.stringify({ reason: reason.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      enqueueToast({ title: "Request failed", variant: "error" });
      return;
    }
    enqueueToast({ title: archived ? "Restored" : "Archived" });
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {archived ? <Badge variant="secondary">Archived</Badge> : null}
      <Button variant={archived ? "secondary" : "destructive"} onClick={() => setOpen(true)}>{archived ? "Restore" : "Archive"}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{archived ? `Restore this ${entity.slice(0, -1)}?` : `Archive this ${entity.slice(0, -1)}?`}</DialogTitle>
            <DialogDescription>This can be undone later from admin.</DialogDescription>
          </DialogHeader>
          {!archived ? <textarea className="min-h-24 w-full rounded border p-2 text-sm" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={archived ? "secondary" : "destructive"} onClick={() => void submit()} disabled={busy}>{archived ? "Restore" : "Archive"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
