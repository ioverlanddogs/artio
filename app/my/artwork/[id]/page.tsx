"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evaluateArtworkReadiness } from "@/lib/publish-readiness";
import { ArtworkGalleryManager } from "@/components/my/artwork/artwork-gallery-manager";
import { PublishPanel } from "@/components/my/PublishPanel";
import { Badge } from "@/components/ui/badge";
import { getPublisherStatusLabel, type UnifiedPublishStatus } from "@/lib/publish-intent";

type Artwork = { id: string; title: string; slug: string | null; description: string | null; year: number | null; medium: string | null; dimensions: string | null; priceAmount: number | null; currency: string | null; featuredAssetId: string | null; isPublished: boolean; deletedAt?: string | null; images: Array<{ id: string; alt: string | null; assetId: string; sortOrder: number; asset: { url: string } }>; };

export default function MyArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetch(`/api/my/artwork/${id}`).then((res) => res.json());
    setArtwork(data.artwork);
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);
  if (!artwork) return <main className="p-6">Loading...</main>;

  const readiness = evaluateArtworkReadiness(artwork, artwork.images);
  const orderedImages = [...artwork.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const status: UnifiedPublishStatus = artwork.deletedAt ? "ARCHIVED" : artwork.isPublished ? "PUBLISHED" : "DRAFT";
  const statusLabel = getPublisherStatusLabel(status);

  return <main className="space-y-4 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">Edit Artwork</h1><Badge variant={statusLabel === "Live" ? "default" : statusLabel === "Archived" ? "outline" : "secondary"}>{statusLabel}</Badge></div><Link href="/my/artwork/new" className="rounded-md border px-3 py-1 text-sm">Add artwork</Link></div>
    {!readiness.ready ? <div className="rounded border bg-muted/20 p-3 text-sm">Complete required fields before publishing.</div> : null}
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <input id="title" className="w-full rounded border px-2 py-1" value={artwork.title} onChange={(e) => setArtwork({ ...artwork, title: e.target.value })} />
        <input className="w-full rounded border px-2 py-1" value={artwork.slug ?? ""} onChange={(e) => setArtwork({ ...artwork, slug: e.target.value || null })} placeholder="slug (optional)" />
        <textarea id="description" className="w-full rounded border px-2 py-1" value={artwork.description ?? ""} onChange={(e) => setArtwork({ ...artwork, description: e.target.value })} />
        <div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={async () => { await fetch(`/api/my/artwork/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: artwork.title, slug: artwork.slug, description: artwork.description }) }); await refresh(); router.refresh(); }}>Save</button></div><h2 id="images" className="font-semibold">Images</h2><p className="text-xs text-muted-foreground">Add at least one image to publish. If cover is missing, one will be auto-selected on publish.</p><ArtworkGalleryManager artworkId={artwork.id} initialImages={orderedImages.map((image) => ({ id: image.id, url: image.asset.url, alt: image.alt, assetId: image.assetId }))} initialCoverAssetId={artwork.featuredAssetId ?? null} />
      </section>
      <aside>
        <PublishPanel resourceType="artwork" id={artwork.id} status={status} title={artwork.title || "Untitled artwork"} publicUrl={`/artwork/${artwork.slug ?? artwork.id}`} onStatusChange={() => { void refresh(); router.refresh(); }} />
      </aside>
    </div></main>;
}
