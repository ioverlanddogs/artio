"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/app/my/_components/ImageUploader";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { enqueueToast } from "@/lib/toast";

type ArtistProfile = {
  name: string;
  bio: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  avatarImageUrl: string | null;
  featuredAssetId: string | null;
  featuredAssetUrl: string | null;
  mediums: string[];
};

export function ArtistProfileForm({ initialProfile }: { initialProfile: ArtistProfile }) {
  const router = useRouter();
  const [form, setForm] = useState<ArtistProfile>(initialProfile);
  const [mediumsDraft, setMediumsDraft] = useState(initialProfile.mediums.join(", "));
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/my/artist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          mediums: mediumsDraft.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      if (res.status === 401) {
        window.location.href = buildLoginRedirectUrl("/my/artist");
        return;
      }
      if (!res.ok) {
        enqueueToast({ title: "Failed to update artist profile", variant: "error" });
        return;
      }

      enqueueToast({ title: "Profile saved", variant: "success" });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAvatarAsset() {
    const previousAssetId = form.featuredAssetId;
    const payload = { featuredAssetId: null, avatarImageUrl: null };
    setForm((prev) => ({ ...prev, ...payload, featuredAssetUrl: null }));

    const res = await fetch("/api/my/artist", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      window.location.href = buildLoginRedirectUrl("/my/artist");
      return;
    }
    if (!res.ok) {
      enqueueToast({ title: "Failed to remove avatar", variant: "error" });
      return;
    }

    if (previousAssetId) {
      await fetch(`/api/my/assets/${previousAssetId}`, { method: "DELETE" });
    }

    enqueueToast({ title: "Avatar removed", variant: "success" });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border p-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      <label className="block">
        <span className="text-sm">Artist name</span>
        <input className="w-full rounded border px-2 py-1" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
      </label>
      <label className="block">
        <span className="text-sm">Statement / bio</span>
        <textarea className="w-full rounded border px-2 py-1" rows={4} value={form.bio ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">Website URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.websiteUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">Instagram URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.instagramUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">Twitter / X URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.twitterUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, twitterUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">LinkedIn URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.linkedinUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">TikTok URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.tiktokUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, tiktokUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">YouTube URL</span>
        <input className="w-full rounded border px-2 py-1" value={form.youtubeUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value || null }))} />
      </label>
      <label className="block">
        <span className="text-sm">Disciplines / mediums</span>
        <span className="block text-xs text-muted-foreground">Comma-separated, e.g. &quot;Oil painting, Ceramics, Printmaking&quot;</span>
        <input
          className="w-full rounded border px-2 py-1"
          value={mediumsDraft}
          onChange={(e) => setMediumsDraft(e.target.value)}
        />
      </label>
      <ImageUploader
        label="Avatar image"
        initialUrl={form.featuredAssetUrl ?? form.avatarImageUrl}
        onUploaded={({ assetId, url }) => setForm((prev) => ({ ...prev, featuredAssetId: assetId, avatarImageUrl: null, featuredAssetUrl: url }))}
        onRemove={removeAvatarAsset}
      />
      <button className="rounded border px-3 py-1" disabled={isSaving}>{isSaving ? "Saving..." : "Save profile"}</button>
    </form>
  );
}
