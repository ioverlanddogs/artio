"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type WikiResult = {
  found: boolean;
  pageId?: string | null;
  pageTitle?: string | null;
  pageUrl?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  hasExistingDescription?: boolean;
};

export function WikipediaLookupButton({
  venueId,
  venueName,
}: {
  venueId: string;
  venueName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WikiResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied([]);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/wikipedia`, {
        method: "POST",
      });
      const data = (await res.json()) as WikiResult & {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Lookup failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Lookup failed — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function apply(opts: { applyDescription: boolean; applyImage: boolean }) {
    if (!result?.found) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/wikipedia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyDescription: opts.applyDescription,
          applyImage: opts.applyImage,
          pageId: result.pageId,
          pageUrl: result.pageUrl,
          description: result.description,
          imageUrl: result.imageUrl,
        }),
      });
      if (res.ok) {
        const fields: string[] = [];
        if (opts.applyDescription) fields.push("description");
        if (opts.applyImage) fields.push("image candidate");
        setApplied(fields);
      } else {
        setError("Apply failed.");
      }
    } catch {
      setError("Apply failed.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold">Wikipedia</h2>
        <p className="text-sm text-muted-foreground">
          Look up {venueName} on Wikipedia to import a description and cover
          image candidate.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void lookup()}
        disabled={loading}
      >
        {loading ? "Looking up…" : "Look up on Wikipedia"}
      </Button>

      {result !== null && !result.found ? (
        <p className="text-sm text-muted-foreground">
          No Wikipedia article found for this venue.
        </p>
      ) : null}

      {result?.found ? (
        <div className="space-y-3 text-sm">
          <p>
            Found:{" "}
            <a
              href={result.pageUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {result.pageTitle}
            </a>
          </p>

          {result.description ? (
            <div className="rounded border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {result.description}
              {result.hasExistingDescription ? (
                <p className="mt-1 text-amber-700">
                  This venue already has a description — applying will overwrite
                  it.
                </p>
              ) : null}
            </div>
          ) : null}

          {result.imageUrl ? (
            <div className="flex items-start gap-3">
              <img
                src={result.imageUrl}
                alt="Wikipedia article image"
                className="h-20 w-20 rounded border object-cover"
              />
              <p className="text-xs text-muted-foreground">
                Wikipedia article image — will be added as a cover image
                candidate.
              </p>
            </div>
          ) : null}

          {applied.length > 0 ? (
            <p className="text-xs text-emerald-600">
              Applied: {applied.join(", ")}. Reload to see changes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.description ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={applying}
                  onClick={() =>
                    void apply({ applyDescription: true, applyImage: false })
                  }
                >
                  Apply description
                </Button>
              ) : null}
              {result.imageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={applying}
                  onClick={() =>
                    void apply({ applyDescription: false, applyImage: true })
                  }
                >
                  Add as image candidate
                </Button>
              ) : null}
              {result.description && result.imageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={applying}
                  onClick={() =>
                    void apply({ applyDescription: true, applyImage: true })
                  }
                >
                  Apply both
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
