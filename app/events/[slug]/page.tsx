import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/runtime-db";
import { EventDetailActions } from "@/components/events/event-detail-actions";
import { EventGalleryLightbox } from "@/components/events/event-gallery-lightbox";
import { ArtworkRelatedSection } from "@/components/artwork/artwork-related-section";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventRailCard } from "@/components/events/event-rail-card";
import { formatEventDateRange } from "@/components/events/event-format";
import { buildDetailMetadata, buildEventJsonLd, getDetailUrl } from "@/lib/seo.public-profiles";
import { getSessionUser } from "@/lib/auth";
import { PageShell } from "@/components/ui/page-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { ContextualNudgeSlot } from "@/components/onboarding/contextual-nudge-slot";
import { resolveEntityPrimaryImage } from "@/lib/public-images";
import { ArtworkCountBadge } from "@/components/artwork/artwork-count-badge";
import { countPublishedArtworksByEvent, listPublishedArtworksByEvent } from "@/lib/artworks";
import { EntityPageViewTracker } from "@/components/analytics/entity-page-view-tracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  if (!hasDatabaseUrl()) return buildDetailMetadata({ kind: "event", slug });

  try {
    const event = await db.event.findFirst({ where: { slug, isPublished: true, deletedAt: null, OR: [{ venueId: null }, { venue: { deletedAt: null } }] }, include: { images: { include: { asset: { select: { url: true } } }, orderBy: { sortOrder: "asc" } } } });
    if (!event) return buildDetailMetadata({ kind: "event", slug });
    const imageUrl = resolveEntityPrimaryImage(event)?.url ?? null;
    return buildDetailMetadata({ kind: "event", slug, title: event.title, description: event.description, imageUrl });
  } catch {
    return buildDetailMetadata({ kind: "event", slug });
  }
}

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  if (!hasDatabaseUrl()) return <PageShell><p className="type-caption">Set DATABASE_URL to view events locally.</p></PageShell>;

  const { slug } = await params;
  const [event, user] = await Promise.all([
    db.event.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      include: {
        venue: true,
        eventTags: { include: { tag: true } },
        eventArtists: { include: { artist: { select: { id: true, slug: true, name: true } } } },
        images: { include: { asset: { select: { url: true } } }, orderBy: { sortOrder: "asc" } },
      },
    }),
    getSessionUser(),
  ]);
  if (!event) notFound();

  const [artworks, artworkCount, similarEvents] = await Promise.all([
    listPublishedArtworksByEvent(event.id, 6),
    countPublishedArtworksByEvent(event.id),
    db.event.findMany({
    where: { isPublished: true, deletedAt: null, id: { not: event.id }, OR: [{ venueId: event.venueId ?? undefined }, { eventArtists: { some: { artistId: { in: event.eventArtists.map((ea) => ea.artistId) } } } }] },
    include: { venue: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" }, include: { asset: { select: { url: true } } } } },
    orderBy: { startAt: "asc" },
    take: 4,
  }),
]);

  const isAuthenticated = Boolean(user);
  const initialSaved = user ? Boolean(await db.favorite.findUnique({ where: { userId_targetType_targetId: { userId: user.id, targetType: "EVENT", targetId: event.id } }, select: { id: true } })) : false;
  const primaryImage = resolveEntityPrimaryImage(event);
  const detailUrl = getDetailUrl("event", slug);
  const jsonLd = buildEventJsonLd({
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    detailUrl,
    imageUrl: primaryImage?.url ?? null,
    venue: event.venue ? { name: event.venue.name, address: event.venue.addressLine1 } : undefined,
  });

  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${new Date(event.startAt).toISOString().replace(/[-:]|\.\d{3}/g, "")}/${new Date(event.endAt ?? event.startAt).toISOString().replace(/[-:]|\.\d{3}/g, "")}`;

  return (
    <PageShell className="page-stack">
      <EntityPageViewTracker entityType="EVENT" entityId={event.id} />
      <Breadcrumbs items={[{ label: "Events", href: "/events" }, { label: event.title, href: `/events/${slug}` }]} />

      <section className="relative overflow-hidden rounded-2xl border border-border">
        <div className="relative h-64 md:h-80">
          {primaryImage ? <Image src={primaryImage.url} alt={primaryImage.alt ?? event.title} fill sizes="100vw" className="object-cover" /> : <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No event image</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full section-stack p-5 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="type-h2 text-white">{event.title}</h1>
              <ArtworkCountBadge count={artworkCount} href={`/artwork?eventId=${event.id}`} badgeClassName="border-white/40 bg-white/10 text-white" />
            </div>
            <p className="type-caption text-white/90">{formatEventDateRange(event.startAt, event.endAt)} · {event.venue?.name ?? "Venue TBA"}</p>
            <EventDetailActions eventId={event.id} eventSlug={event.slug} nextUrl={`/events/${slug}`} isAuthenticated={isAuthenticated} initialSaved={initialSaved} calendarLink={calendarLink} />
            {isAuthenticated && (event.venue?.slug || event.eventArtists[0]?.artist.slug) ? (
              <ContextualNudgeSlot
                page="event_detail"
                type="event_detail_follow"
                nudgeId="nudge_event_detail_follow"
                title="Stay in the loop"
                body="Follow this venue or artist to personalize your following feed."
                destination={event.venue?.slug ? `/venues/${event.venue.slug}` : `/artists/${event.eventArtists[0]?.artist.slug}`}
              />
            ) : null}
          </div>
        </div>
      </section>

      {event.images.filter((image) => image.asset).length >= 2 ? (
        <EventGalleryLightbox
          images={event.images.flatMap((image) => (image.asset ? [{ id: image.id, src: image.asset.url, alt: image.alt ?? event.title }] : []))}
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-[2fr_1fr] md:gap-6">
        <div className="section-stack">
          <article className="section-stack">
            <SectionHeader title="About this event" />
            <p className="type-caption whitespace-pre-wrap">{event.description || "Details coming soon."}</p>
          </article>
          <ArtworkRelatedSection title="Artworks at this event" subtitle="Published works linked to this event." items={artworks} viewAllHref={artworkCount > 6 ? `/artwork?eventId=${event.id}` : undefined} showArtistName />
          {event.eventArtists.length ? <article className="section-stack"><SectionHeader title="Lineup" /><div className="flex flex-wrap gap-2">{event.eventArtists.map((entry) => <Badge key={entry.artistId} variant="secondary">{entry.artist.name}</Badge>)}</div></article> : null}
          {event.eventTags.length ? <article className="section-stack"><SectionHeader title="Tags" /><div className="flex flex-wrap gap-2">{event.eventTags.map((eventTag) => <Badge key={eventTag.tag.id} variant="outline">{eventTag.tag.name}</Badge>)}</div></article> : null}
        </div>

        <Card className="section-stack h-fit p-6">
          <h3 className="type-h3">At a glance</h3>
          <p className="type-caption">{formatEventDateRange(event.startAt, event.endAt)}</p>
          <p className="type-caption">{event.venue?.name ?? "Venue TBA"}</p>
          <p className="type-caption">{event.venue?.addressLine1 ?? "Address unavailable"}</p>
          {event.venue?.slug ? <Link href={`/venues/${event.venue.slug}`} className="text-sm underline">View details</Link> : null}
        </Card>
      </section>

      {similarEvents.length ? (
        <section className="section-stack">
          <SectionHeader title="You might also like" />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {similarEvents.map((similar) => (
              <EventRailCard
                key={similar.id}
                href={`/events/${similar.slug}`}
                title={similar.title}
                startAt={similar.startAt}
                venueName={similar.venue?.name}
                imageUrl={resolveEntityPrimaryImage(similar)?.url ?? null}
                imageAlt={resolveEntityPrimaryImage(similar)?.alt}
              />
            ))}
          </div>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </PageShell>
  );
}
