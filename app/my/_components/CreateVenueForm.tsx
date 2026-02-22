"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CreateVenuePayload = {
  name: string;
  slug?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  lat?: number;
  lng?: number;
};

export default function CreateVenueForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateVenuePayload>({ name: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/my/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body?.error?.message || "Failed to create venue");
      setIsSubmitting(false);
      return;
    }

    router.push(`/my/venues/${body.venueId}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-3">
      <label className="block">
        <span className="text-sm">Name</span>
        <input
          className="w-full rounded border p-2"
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </label>
      <label className="block">
        <span className="text-sm">Slug (optional)</span>
        <input className="w-full rounded border p-2" value={form.slug ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Description</span>
        <textarea className="w-full rounded border p-2" value={form.description ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Address line 1</span>
        <input className="w-full rounded border p-2" value={form.addressLine1 ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Address line 2</span>
        <input className="w-full rounded border p-2" value={form.addressLine2 ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">City</span>
        <input className="w-full rounded border p-2" value={form.city ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Region</span>
        <input className="w-full rounded border p-2" value={form.region ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Postcode</span>
        <input className="w-full rounded border p-2" value={form.postcode ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, postcode: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Country</span>
        <input className="w-full rounded border p-2" value={form.country ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Website</span>
        <input className="w-full rounded border p-2" value={form.websiteUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value || undefined }))} />
      </label>
      <label className="block">
        <span className="text-sm">Instagram URL</span>
        <input className="w-full rounded border p-2" value={form.instagramUrl ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value || undefined }))} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">Latitude</span>
          <input
            className="w-full rounded border p-2"
            type="number"
            step="any"
            value={form.lat ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
        </label>
        <label className="block">
          <span className="text-sm">Longitude</span>
          <input
            className="w-full rounded border p-2"
            type="number"
            step="any"
            value={form.lng ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create venue"}</Button>
    </form>
  );
}
