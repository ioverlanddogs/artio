import React from "react";
import Link from "next/link";

type FilterPill = {
  key: string;
  label: string;
  value?: string;
  removeHref: string;
};

type ActiveFiltersBarProps = {
  pills: FilterPill[];
  clearAllHref: string;
};

export function ActiveFiltersBar({ pills, clearAllHref }: ActiveFiltersBarProps) {
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border bg-card px-3 py-2 text-sm">
      <span className="text-muted-foreground">Filters:</span>
      {pills.map((pill) => (
        <span key={pill.key} className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs" title={pill.value}>
          <span>{pill.label}</span>
          <Link className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${pill.label} filter`} href={pill.removeHref}>
            ×
          </Link>
        </span>
      ))}
      <Link className="ml-auto text-xs underline text-muted-foreground hover:text-foreground" href={clearAllHref}>
        Clear filters
      </Link>
    </div>
  );
}

export type { FilterPill, ActiveFiltersBarProps };
