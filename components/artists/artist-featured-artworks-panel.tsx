"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ArtworkOption = { id: string; title: string; slug: string | null; coverUrl: string | null; isPublished: boolean };
type FeaturedArtwork = { id: string; title: string; slug: string | null; coverUrl: string | null; sortOrder: number };

export function ArtistFeaturedArtworksPanel({ initialFeatured, options }: { initialFeatured: FeaturedArtwork[]; options: ArtworkOption[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(initialFeatured.map((item) => item.id));

  const filtered = useMemo(() => options.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const selectedDetails = selected.map((id) => options.find((option) => option.id === id)).filter(Boolean) as ArtworkOption[];

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 6) return current;
      return [...current, id];
    });
  }

  function moveAt(index: number, delta: -1 | 1) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= selected.length) return;
    setSelected((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/my/artist/featured-artworks", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ artworkIds: selected }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to save featured artworks");
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save featured artworks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded border bg-background p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Featured artworks</h2>
          <p className="text-xs text-muted-foreground">Featured artworks appear on your public artist page.</p>
        </div>
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => setOpen((current) => !current)}>{open ? "Close" : "Edit featured"}</button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {initialFeatured.length === 0 ? <p className="text-sm text-muted-foreground">No featured artworks yet.</p> : initialFeatured.map((item) => (
          <div key={item.id} className="rounded border p-2 text-sm">
            <div className="relative mb-2 aspect-square w-full overflow-hidden rounded border bg-muted">
              {item.coverUrl ? <Image src={item.coverUrl} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{item.title}</div>
              <Link href={`/my/artwork/${item.id}`} className="text-xs text-muted-foreground underline">Edit</Link>
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <div className="space-y-3 rounded border p-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your published artworks" className="w-full rounded border px-2 py-1 text-sm" />
          <div className="max-h-48 space-y-1 overflow-auto rounded border p-2">
            {filtered.map((item) => {
              const checked = selected.includes(item.id);
              const disabled = !checked && selected.length >= 6;
              return <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(item.id)} />{item.title}</label>;
            })}
          </div>

          <div className="space-y-1">
            {selectedDetails.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative h-10 w-10 flex-none overflow-hidden rounded border bg-muted">
                    {item.coverUrl ? <Image src={item.coverUrl} alt={item.title} fill sizes="40px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>}
                  </div>
                  <span className="truncate">{item.title}</span>
                </div>
                <div className="space-x-1">
                  <button type="button" onClick={() => moveAt(index, -1)} className="rounded border px-2" disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveAt(index, 1)} className="rounded border px-2" disabled={index === selectedDetails.length - 1}>↓</button>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" onClick={() => void save()} disabled={saving} className="rounded border px-3 py-1 text-sm">{saving ? "Saving..." : "Save featured"}</button>
        </div>
      ) : null}
    </section>
  );
}
