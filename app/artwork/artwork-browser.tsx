"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";

type Item = { id: string; slug: string | null; title: string; year: number | null; medium: string | null; priceAmount: number | null; currency: string | null; coverUrl: string | null; views30?: number; artist: { id: string; name: string; slug: string } };
const SORTS = [
  ["RECENT", "Recently updated"],
  ["OLDEST", "Oldest"],
  ["YEAR_DESC", "Year (newest)"],
  ["YEAR_ASC", "Year (oldest)"],
  ["PRICE_ASC", "Price (low to high)"],
  ["PRICE_DESC", "Price (high to low)"],
  ["VIEWS_30D_DESC", "Most viewed (30d)"],
] as const;
export function ArtworkBrowser({ signedIn, mediumOptions }: { signedIn: boolean; mediumOptions: string[] }) {
  const FALLBACK_MEDIUMS = ["Painting", "Sculpture", "Photography", "Digital", "Mixed Media", "Installation"];
  const availableMediums = mediumOptions.length > 0 ? mediumOptions : FALLBACK_MEDIUMS;
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveName, setSaveName] = useState("Artworks: Filtered search");
  const [frequency, setFrequency] = useState<"WEEKLY" | "OFF">("WEEKLY");
  const [message, setMessage] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState(sp?.get("query") ?? "");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const isViewsSort = (sp?.get("sort") ?? "RECENT") === "VIEWS_30D_DESC";

  const queryString = sp?.toString() ?? "";
  const page = Number(sp?.get("page") ?? "1");
  const pageSize = Number(sp?.get("pageSize") ?? "20");

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) next.delete(k); else next.set(k, v);
    });
    if (Object.keys(updates).some((key) => key !== "page")) next.set("page", "1");
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };

  const mediums = sp?.getAll("medium") ?? [];

  useEffect(() => {
    const t = setTimeout(() => setParam({ query: queryDraft || null }), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryDraft]);

  useEffect(() => {
    const active = true;
    setLoading(true);
    fetch(`/api/artwork?${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => active && setLoading(false));
  }, [queryString]);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        const ids = (data?.items ?? [])
          .filter((item: { targetType?: string; targetId?: string }) => item.targetType === "ARTWORK" && typeof item.targetId === "string")
          .map((item: { targetId: string }) => item.targetId);
        setFavoriteIds(new Set(ids));
      })
      .catch(() => {
        setFavoriteIds(new Set());
      });
  }, [signedIn]);

  const toggleFavorite = async (artworkId: string) => {
    const isSaved = favoriteIds.has(artworkId);
    const next = new Set(favoriteIds);
    if (isSaved) next.delete(artworkId); else next.add(artworkId);
    setFavoriteIds(next);

    try {
      const response = await fetch("/api/favorites", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "ARTWORK", targetId: artworkId }),
      });
      if (!response.ok) {
        const revert = new Set(next);
        if (isSaved) revert.add(artworkId); else revert.delete(artworkId);
        setFavoriteIds(revert);
      }
    } catch {
      const revert = new Set(next);
      if (isSaved) revert.add(artworkId); else revert.delete(artworkId);
      setFavoriteIds(revert);
    }
  };

  const hasFilters = useMemo(() => (sp?.toString() ?? "").length > 0, [sp]);

  const saveSearch = async () => {
    const params = Object.fromEntries((sp?.entries() ?? []));
    const mediumValues = sp?.getAll("medium") ?? [];
    const payload = {
      type: "ARTWORK",
      name: saveName.trim() || "Artworks: Filtered search",
      frequency: frequency === "WEEKLY" ? "WEEKLY" : undefined,
      params: { provider: "ARTWORKS", ...params, medium: mediumValues, page: undefined },
    };
    const res = await fetch("/api/saved-searches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setMessage("Saved search created.");
      setSaveOpen(false);
    } else {
      setMessage("Could not save search.");
    }
  };

  return <div className="space-y-4">
    <div className="md:hidden"><button className="rounded border px-3 py-1 text-sm" onClick={() => setFiltersOpen((v) => !v)}>{filtersOpen ? "Hide filters" : "Filters"}</button></div>
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <aside className={`space-y-3 rounded border p-3 ${filtersOpen ? "block" : "hidden"} md:block`}>
        <input value={queryDraft} onChange={(e) => setQueryDraft(e.target.value)} placeholder="Search title or description" className="w-full rounded border p-2 text-sm" />
        <div>
          <p className="text-xs font-semibold uppercase">Medium</p>
          <div className="mt-1 space-y-1">
            {availableMediums.map((medium) => <label key={medium} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mediums.includes(medium)} onChange={() => {
              const next = mediums.includes(medium) ? mediums.filter((m) => m !== medium) : [...mediums, medium];
              const params = new URLSearchParams(sp?.toString() ?? "");
              params.delete("medium");
              next.forEach((m) => params.append("medium", m));
              params.set("page", "1");
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }} />{medium}</label>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2"><input className="rounded border p-2 text-sm" placeholder="Year from" defaultValue={sp?.get("yearFrom") ?? ""} onBlur={(e) => setParam({ yearFrom: e.target.value || null })} /><input className="rounded border p-2 text-sm" placeholder="Year to" defaultValue={sp?.get("yearTo") ?? ""} onBlur={(e) => setParam({ yearTo: e.target.value || null })} /></div>
        <div className="grid grid-cols-2 gap-2"><input className="rounded border p-2 text-sm" placeholder="Price min" defaultValue={sp?.get("priceMin") ?? ""} onBlur={(e) => setParam({ priceMin: e.target.value || null })} /><input className="rounded border p-2 text-sm" placeholder="Price max" defaultValue={sp?.get("priceMax") ?? ""} onBlur={(e) => setParam({ priceMax: e.target.value || null })} /></div>
        <select className="w-full rounded border p-2 text-sm" value={sp?.get("currency") ?? ""} onChange={(e) => setParam({ currency: e.target.value || null })}><option value="">Any currency</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sp?.get("hasImages") === "true"} onChange={(e) => setParam({ hasImages: e.target.checked ? "true" : null })} />Has images</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sp?.get("hasPrice") === "true"} onChange={(e) => setParam({ hasPrice: e.target.checked ? "true" : null })} />Has price</label>
        {hasFilters ? <button className="rounded border px-2 py-1 text-sm" onClick={() => router.replace(pathname)}>Clear filters</button> : null}
      </aside>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><select className="rounded border p-2 text-sm" value={sp?.get("sort") ?? "RECENT"} onChange={(e) => setParam({ sort: e.target.value })}>{SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{signedIn ? <button className="rounded border px-3 py-2 text-sm" onClick={() => setSaveOpen(true)}>Save search</button> : <Link href="/api/auth/signin" className="text-sm underline">Sign in to save</Link>}</div>
        {message ? <div className="rounded border border-emerald-300 bg-emerald-50 p-2 text-sm">{message} <Link className="underline" href="/saved-searches">Manage saved searches</Link></div> : null}
        {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 animate-pulse rounded border bg-muted" />)}</div> : null}
        {!loading && items.length === 0 ? <div className="rounded border p-6 text-sm">No artworks found. <button className="underline" onClick={() => router.replace(pathname)}>Clear filters</button></div> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="relative rounded border p-3 hover:bg-muted/40"><Link href={`/artwork/${item.slug ?? item.id}`} className="block"><div className="relative mb-2 h-48 overflow-hidden rounded bg-muted">{item.coverUrl ? <Image src={item.coverUrl} alt={item.title} fill className="object-cover" /> : null}</div><div className="font-medium">{item.title}</div><div className="text-sm text-muted-foreground">{item.artist.name}</div><div className="text-xs text-muted-foreground">{item.year ?? ""} {item.medium ?? ""}</div>{item.priceAmount != null && item.currency ? <div className="text-xs">{formatPrice(item.priceAmount, item.currency)}</div> : null}{isViewsSort ? <div className="text-xs text-muted-foreground">{item.views30 ?? 0} views (30d)</div> : null}</Link>{signedIn ? <button type="button" aria-label={favoriteIds.has(item.id) ? "Unsave artwork" : "Save artwork"} aria-pressed={favoriteIds.has(item.id)} onClick={() => void toggleFavorite(item.id)} className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm ui-trans hover:bg-muted"><Bookmark className={`h-4 w-4 ${favoriteIds.has(item.id) ? "fill-current" : ""}`} /></button> : null}</article>)}</div>
        <div className="flex items-center justify-between text-sm"><span>{total} results</span><div className="space-x-2"><button disabled={page <= 1} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setParam({ page: String(page - 1) })}>Prev</button><button disabled={page * pageSize >= total} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setParam({ page: String(page + 1) })}>Next</button></div></div>
      </section>
    </div>

    <Dialog open={saveOpen && signedIn} onOpenChange={setSaveOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save this artwork search</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <input value={saveName} onChange={(e) => setSaveName(e.target.value)} className="w-full rounded border p-2 text-sm" />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as "WEEKLY" | "OFF")} className="w-full rounded border p-2 text-sm"><option value="WEEKLY">Weekly</option><option value="OFF">Off</option></select>
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => void saveSearch()}>Save</button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
