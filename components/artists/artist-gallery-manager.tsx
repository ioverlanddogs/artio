"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ImageUploader from "@/app/my/_components/ImageUploader";
import { buildLoginRedirectUrl } from "@/lib/auth-redirect";
import { enqueueToast } from "@/lib/toast";

type ArtistImage = { id: string; url: string; alt: string | null; sortOrder: number; assetId?: string | null };

function SortableImageCard({
  image,
  coverImageUrl,
  loadingMap,
  saveAlt,
  setAsCover,
  remove,
}: {
  image: ArtistImage;
  coverImageUrl: string | null;
  loadingMap: Record<string, boolean>;
  saveAlt: (id: string, alt: string) => Promise<void>;
  setAsCover: (image: ArtistImage) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <article ref={setNodeRef} style={style} className="space-y-2 rounded border p-3">
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="relative h-36 w-full overflow-hidden rounded border">
          <Image src={image.url} alt={image.alt ?? "Artist image"} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
      </div>
      {coverImageUrl === image.url ? <p className="text-xs font-medium text-emerald-700">Current cover</p> : null}
      <input className="w-full rounded border px-2 py-1 text-sm" defaultValue={image.alt ?? ""} placeholder="Alt text" onBlur={(event) => saveAlt(image.id, event.target.value)} disabled={Boolean(loadingMap[image.id])} />
      <div className="flex gap-2 text-sm">
        <button className="rounded border px-2 py-1" disabled={coverImageUrl === image.url || Boolean(loadingMap[`cover:${image.id}`])} onClick={() => setAsCover(image)}>Set as cover</button>
        <button className="rounded border px-2 py-1 text-red-700" disabled={Boolean(loadingMap[image.id])} onClick={() => remove(image.id)}>Delete</button>
      </div>
    </article>
  );
}

export function ArtistGalleryManager({ initialImages, initialCover }: { initialImages: ArtistImage[]; initialCover: string | null }) {
  const router = useRouter();
  const [images, setImages] = useState<ArtistImage[]>(initialImages);
  const [coverImageUrl, setCoverImageUrl] = useState(initialCover);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const sorted = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);

  function handleAuth(res: Response) {
    if (res.status === 401) {
      window.location.href = buildLoginRedirectUrl("/my/artist");
      return true;
    }
    if (res.status === 429) enqueueToast({ title: "Too many requests, try again", variant: "error" });
    return false;
  }

  async function saveAlt(imageId: string, alt: string) {
    setLoadingMap((prev) => ({ ...prev, [imageId]: true }));
    try {
      const res = await fetch(`/api/my/artist/images/${imageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alt }),
      });
      if (handleAuth(res)) return;
      if (!res.ok) {
        enqueueToast({ title: "Failed to update alt text", variant: "error" });
        return;
      }
      const data = (await res.json()) as { image: ArtistImage };
      setImages((current) => current.map((item) => (item.id === imageId ? data.image : item)));
      enqueueToast({ title: "Alt text saved", variant: "success" });
    } finally {
      setLoadingMap((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((img) => img.id === active.id);
    const newIndex = sorted.findIndex((img) => img.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((img: ArtistImage, order: number) => ({ ...img, sortOrder: order }));
    setImages(reordered);
    const res = await fetch("/api/my/artist/images/reorder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((img: ArtistImage) => img.id) }),
    });
    if (handleAuth(res)) return;
    if (!res.ok) {
      enqueueToast({ title: "Failed to reorder images", variant: "error" });
      setImages(sorted);
    }
  }

  async function remove(imageId: string) {
    setLoadingMap((prev) => ({ ...prev, [imageId]: true }));
    const prev = images;
    setImages((current) => current.filter((img) => img.id !== imageId));

    const res = await fetch(`/api/my/artist/images/${imageId}`, { method: "DELETE" });
    if (handleAuth(res)) return;
    if (!res.ok) {
      setImages(prev);
      enqueueToast({ title: "Failed to delete image", variant: "error" });
      return;
    }

    enqueueToast({ title: "Image deleted", variant: "success" });
  }


  async function clearCover() {
    if (!coverImageUrl || !window.confirm("Clear current cover image?")) return;

    const previous = coverImageUrl;
    setCoverImageUrl(null);
    setLoadingMap((prev) => ({ ...prev, clearCover: true }));

    try {
      const res = await fetch("/api/my/artist/cover", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageId: null }),
      });

      if (handleAuth(res)) return;
      if (!res.ok) {
        setCoverImageUrl(previous);
        enqueueToast({ title: "Failed to clear cover", variant: "error" });
        return;
      }

      enqueueToast({ title: "Cover cleared", variant: "success" });
      router.refresh();
    } finally {
      setLoadingMap((prev) => ({ ...prev, clearCover: false }));
    }
  }

  async function setAsCover(image: ArtistImage) {
    const previous = coverImageUrl;
    setCoverImageUrl(image.url);
    setLoadingMap((prev) => ({ ...prev, [`cover:${image.id}`]: true }));

    try {
      const res = await fetch("/api/my/artist/cover", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      });

      if (handleAuth(res)) return;
      if (!res.ok) {
        setCoverImageUrl(previous);
        enqueueToast({ title: "Failed to update cover", variant: "error" });
        return;
      }

      const data = (await res.json()) as { cover: { featuredImageUrl: string | null } };
      setCoverImageUrl(data.cover.featuredImageUrl ?? image.url);
      enqueueToast({ title: "Cover updated", variant: "success" });
      router.refresh();
    } finally {
      setLoadingMap((prev) => ({ ...prev, [`cover:${image.id}`]: false }));
    }
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gallery</h2>
        {coverImageUrl ? (
          <button className="rounded border px-2 py-1 text-sm" disabled={Boolean(loadingMap.clearCover)} onClick={clearCover}>Clear cover</button>
        ) : null}
      </div>

      <ImageUploader
        label="Add gallery image"
        onUploaded={async ({ url }) => {
          const createRes = await fetch("/api/my/artist/images", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url, alt: null }),
          });
          if (handleAuth(createRes)) return;
          if (!createRes.ok) {
            enqueueToast({ title: "Failed to save image", variant: "error" });
            return;
          }
          const data = (await createRes.json()) as { image: ArtistImage };
          setImages((current) => [...current, data.image]);
          enqueueToast({ title: "Gallery updated", variant: "success" });
          router.refresh();
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-3 md:grid-cols-2">
            {sorted.map((image) => (
              <SortableImageCard
                key={image.id}
                image={image}
                coverImageUrl={coverImageUrl}
                loadingMap={loadingMap}
                saveAlt={saveAlt}
                setAsCover={setAsCover}
                remove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
