"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { evaluateArtworkReadiness, type CheckItem } from "@/lib/publish-readiness";
import { PublishReadinessChecklist } from "@/components/publishing/publish-readiness-checklist";
import { ArtworkGalleryManager } from "@/components/my/artwork/artwork-gallery-manager";

type Artwork = { id: string; title: string; slug: string | null; description: string | null; year: number | null; medium: string | null; dimensions: string | null; priceAmount: number | null; currency: string | null; featuredAssetId: string | null; isPublished: boolean; images: Array<{ id: string; alt: string | null; assetId: string; sortOrder: number; asset: { url: string } }>; };

export default function MyArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [publishErrorBlocking, setPublishErrorBlocking] = useState<CheckItem[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetch(`/api/my/artwork/${id}`).then((res) => res.json());
    setArtwork(data.artwork);
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);
  if (!artwork) return <main className="p-6">Loading...</main>;

  const readiness = evaluateArtworkReadiness(artwork, artwork.images);
  const blocking = publishErrorBlocking.length > 0 ? publishErrorBlocking : readiness.blocking;
  const orderedImages = [...artwork.images].sort((a, b) => a.sortOrder - b.sortOrder);

  return <main className="space-y-4 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Edit Artwork</h1><Link href="/my/artwork/new" className="rounded-md border px-3 py-1 text-sm">Add artwork</Link></div>
    <div ref={panelRef}><PublishReadinessChecklist title="Artwork publish readiness" ready={blocking.length === 0} blocking={blocking} warnings={readiness.warnings} /></div>
    <input id="title" className="w-full rounded border px-2 py-1" value={artwork.title} onChange={(e) => setArtwork({ ...artwork, title: e.target.value })} />
    <input className="w-full rounded border px-2 py-1" value={artwork.slug ?? ""} onChange={(e) => setArtwork({ ...artwork, slug: e.target.value || null })} placeholder="slug (optional)" />
    <textarea id="description" className="w-full rounded border px-2 py-1" value={artwork.description ?? ""} onChange={(e) => setArtwork({ ...artwork, description: e.target.value })} />
    <div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={async () => { await fetch(`/api/my/artwork/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: artwork.title, slug: artwork.slug, description: artwork.description }) }); await refresh(); }}>Save</button><button className="rounded border px-2 py-1 disabled:opacity-60" disabled={!readiness.ready && !artwork.isPublished} onClick={async () => { const isPublished = !artwork.isPublished; const response = await fetch(`/api/my/artwork/${id}/publish`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isPublished }) }); const data = await response.json(); if (!response.ok && data.error === "NOT_READY") { setPublishErrorBlocking(data.blocking ?? []); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } if (response.ok) { setPublishErrorBlocking([]); setArtwork({ ...artwork, isPublished }); await refresh(); } }}>{artwork.isPublished ? "Unpublish" : "Publish"}</button></div><h2 id="images" className="font-semibold">Images</h2><p className="text-xs text-muted-foreground">Add at least one image to publish. If cover is missing, one will be auto-selected on publish.</p><ArtworkGalleryManager artworkId={artwork.id} initialImages={orderedImages.map((image) => ({ id: image.id, url: image.asset.url, alt: image.alt }))} initialCoverImageId={artwork.featuredAssetId ?? null} /></main>;
}
