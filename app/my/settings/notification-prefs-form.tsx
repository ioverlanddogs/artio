"use client";

import { useState } from "react";
import { enqueueToast } from "@/lib/toast";

type NotificationPrefs = {
  emailOnSubmissionResult: boolean;
  emailOnTeamInvite: boolean;
  weeklyDigest: boolean;
};

type Props = {
  initialPrefs: NotificationPrefs;
};

export function NotificationPrefsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [saving, setSaving] = useState<Partial<Record<keyof NotificationPrefs, boolean>>>({});

  const toggle = async (field: keyof NotificationPrefs, nextValue: boolean) => {
    const prev = prefs[field];
    setPrefs((current) => ({ ...current, [field]: nextValue }));
    setSaving((current) => ({ ...current, [field]: true }));

    try {
      const res = await fetch("/api/my/settings/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      if (!res.ok) throw new Error("save_failed");
      enqueueToast({ title: "Notification preference saved", variant: "success" });
    } catch {
      setPrefs((current) => ({ ...current, [field]: prev }));
      enqueueToast({ title: "Failed to save notification preference", variant: "error" });
    } finally {
      setSaving((current) => ({ ...current, [field]: false }));
    }
  };

  const rows: Array<{ field: keyof NotificationPrefs; label: string }> = [
    { field: "emailOnSubmissionResult", label: "Email me when a submission is approved or rejected" },
    { field: "emailOnTeamInvite", label: "Email me when I receive a team invite" },
    { field: "weeklyDigest", label: "Send me a weekly activity digest" },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <label key={row.field} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
          <span>{row.label}</span>
          <div className="flex items-center gap-2">
            {saving[row.field] ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
            <input
              type="checkbox"
              checked={prefs[row.field]}
              onChange={(event) => {
                void toggle(row.field, event.target.checked);
              }}
            />
          </div>
        </label>
      ))}
    </div>
  );
}
