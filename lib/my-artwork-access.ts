import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/http-errors";

export async function requireMyArtworkAccess(artworkId: string) {
  const user = await requireAuth();
  if (user.role === "ADMIN") return { user, artwork: await db.artwork.findUnique({ where: { id: artworkId }, select: { id: true, artistId: true } }) };

  const artwork = await db.artwork.findUnique({ where: { id: artworkId }, select: { id: true, artistId: true, artist: { select: { userId: true } } } });
  if (!artwork) throw new Error("not_found");
  if (artwork.artist.userId !== user.id) throw new ForbiddenError();
  return { user, artwork: { id: artwork.id, artistId: artwork.artistId } };
}
