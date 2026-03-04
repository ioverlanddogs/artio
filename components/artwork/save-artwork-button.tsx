"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SaveArtworkButtonProps = {
  artworkId: string;
  initialSaved: boolean;
  signedIn: boolean;
};

export function SaveArtworkButton({ artworkId, initialSaved, signedIn }: SaveArtworkButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, setIsPending] = useState(false);

  async function onToggle() {
    if (isPending) return;
    if (!signedIn) {
      router.push("/login");
      return;
    }

    const nextSaved = !saved;
    setSaved(nextSaved);
    setIsPending(true);

    try {
      const response = await fetch("/api/favorites", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "ARTWORK", targetId: artworkId }),
      });

      if (!response.ok) {
        setSaved(!nextSaved);
      }
    } catch {
      setSaved(!nextSaved);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      disabled={isPending}
      aria-pressed={saved}
      aria-busy={isPending}
      className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1 text-sm ui-trans ui-press hover:bg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
