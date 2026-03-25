import Link from "next/link";
import { db } from "@/lib/db";
import { TAG_CATEGORIES } from "@/lib/tag-categories";

export const dynamic = "force-dynamic";

export default async function TagsBrowsePage() {
  const tags = await db.tag.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { eventTags: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Browse by Tags</h1>
        <p className="mt-2 text-muted-foreground">Explore events through medium, genre, movement, and mood.</p>
      </div>
      {TAG_CATEGORIES.map((category) => {
        const categoryTags = tags.filter((tag) => tag.category === category);
        return (
          <section key={category} className="space-y-3">
            <h2 className="text-xl font-medium capitalize">{category}</h2>
            <div className="flex flex-wrap gap-2">
              {categoryTags.filter((tag) => tag._count.eventTags > 0).map((tag) => (
                <Link key={tag.id} href={`/events?tags=${encodeURIComponent(tag.slug)}`} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                  {tag.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {tag._count.eventTags}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
