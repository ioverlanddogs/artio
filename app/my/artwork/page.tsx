import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";

export default async function MyArtworkPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/artwork");
  const { q = "", status, sort = "updated" } = await searchParams;

  const artist = await db.artist.findUnique({ where: { userId: user.id }, select: { id: true } });
  const items = artist ? await db.artwork.findMany({
    where: { artistId: artist.id, title: q ? { contains: q, mode: "insensitive" } : undefined, isPublished: status === "Published" ? true : status === "Draft" ? false : undefined },
    orderBy: sort === "title" ? { title: "asc" } : { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, isPublished: true, updatedAt: true },
  }) : [];

  return (
    <main className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2"><input name="q" defaultValue={q} className="h-9 rounded border px-2 text-sm" placeholder="Search artwork" /><Button size="sm">Search</Button></form>
        {(["Draft", "Published"] as const).map((chip) => <Link key={chip} className="rounded border px-2 py-1 text-xs" href={`/my/artwork?status=${chip}`}>{chip}</Link>)}
        <Link className="rounded border px-2 py-1 text-xs" href="/my/artwork?sort=title">Sort: Title</Link>
        <Button asChild size="sm"><Link href="/my/artwork/new">Add artwork</Link></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <article key={item.id} className="rounded border p-3"><h3 className="font-medium">{item.title}</h3><p className="text-xs text-muted-foreground">{item.isPublished ? "Published" : "Draft"}</p><div className="mt-2 space-x-2 text-sm"><Link className="underline" href={`/my/artwork/${item.id}`}>Edit</Link><Link className="underline" href={`/api/my/artwork/${item.id}/publish`}>{item.isPublished ? "Unpublish" : "Publish"}</Link><Link className="underline" href={`/artwork/${item.slug ?? item.id}`}>View Public</Link></div></article>)}
      </div>
    </main>
  );
}
