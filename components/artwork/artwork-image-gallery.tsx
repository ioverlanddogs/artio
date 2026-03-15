"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type GalleryImage = {
  id: string;
  src: string;
  alt: string;
};

type ArtworkMeta = {
  title: string;
  medium: string | null;
  dimensions: string | null;
  priceFormatted: string | null;
};

export function ArtworkImageGallery({
  images,
  artworkMeta,
}: {
  images: GalleryImage[];
  artworkMeta: ArtworkMeta;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight" && images.length > 1) {
        setActiveIndex((i) => (i + 1) % images.length);
      }
      if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handler);
    };
  }, [lightboxOpen, images.length]);

  if (images.length === 0) return null;

  const activeImage = images[activeIndex];

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-lg bg-muted cursor-zoom-in"
        style={{ aspectRatio: "4/3" }}
        onClick={() => setLightboxOpen(true)}
        aria-label="View full size"
      >
        {activeImage?.src ? (
          <Image
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
        ) : null}
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition ${
                index === activeIndex
                  ? "border-foreground"
                  : "border-transparent hover:border-muted-foreground/40"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && activeImage ? (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white shrink-0">
            <div>
              <p className="font-semibold">{artworkMeta.title}</p>
              <p className="text-sm text-white/70">
                {[artworkMeta.medium, artworkMeta.dimensions]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((i) => (i - 1 + images.length) % images.length)
                }
                className="absolute left-4 rounded border border-white/30 px-3 py-2 text-white hover:bg-white/10"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="relative h-full w-full">
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((i) => (i + 1) % images.length)
                }
                className="absolute right-4 rounded border border-white/30 px-3 py-2 text-white hover:bg-white/10"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-white shrink-0">
            <span>
              {activeIndex + 1} / {images.length}
            </span>
            {artworkMeta.priceFormatted && (
              <span className="font-medium">{artworkMeta.priceFormatted}</span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
