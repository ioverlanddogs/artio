import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "@/components/follows/follow-button";
import { Card, CardContent } from "@/components/ui/card";

type ArtworkArtistPanelProps = {
  artist: {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    avatarUrl: string | null;
    followersCount: number;
  };
  initialIsFollowing: boolean;
  isAuthenticated: boolean;
};

export function ArtworkArtistPanel({
  artist,
  initialIsFollowing,
  isAuthenticated,
}: ArtworkArtistPanelProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Link href={`/artists/${artist.slug}`} className="shrink-0">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
              {artist.avatarUrl ? (
                <Image
                  src={artist.avatarUrl}
                  alt={artist.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/artists/${artist.slug}`}
                  className="font-semibold hover:underline"
                >
                  {artist.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {artist.followersCount}{" "}
                  {artist.followersCount === 1 ? "follower" : "followers"}
                </p>
              </div>
              <FollowButton
                targetType="ARTIST"
                targetId={artist.id}
                initialIsFollowing={initialIsFollowing}
                initialFollowersCount={artist.followersCount}
                isAuthenticated={isAuthenticated}
                analyticsSlug={artist.slug}
              />
            </div>

            {artist.bio ? (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {artist.bio.slice(0, 200)}
                {artist.bio.length > 200 ? "…" : ""}
              </p>
            ) : null}

            <Link
              href={`/artists/${artist.slug}`}
              className="text-xs underline text-muted-foreground"
            >
              View full profile →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
