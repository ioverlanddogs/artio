export type ArtistCompletenessInput = {
  bio: string | null;
  mediums: string[];
  websiteUrl: string | null;
  instagramUrl: string | null;
  nationality: string | null;
  birthYear: number | null;
};

export function computeArtistCompleteness(artist: ArtistCompletenessInput): {
  score: number;
  missing: string[];
} {
  const checks = [
    { label: "bio", has: Boolean(artist.bio?.trim()) },
    { label: "mediums", has: artist.mediums.length > 0 },
    { label: "website", has: Boolean(artist.websiteUrl?.trim()) },
    { label: "instagram", has: Boolean(artist.instagramUrl?.trim()) },
    { label: "nationality", has: Boolean(artist.nationality?.trim()) },
    { label: "birth year", has: artist.birthYear != null },
  ];
  const present = checks.filter((c) => c.has).length;
  const missing = checks.filter((c) => !c.has).map((c) => c.label);
  return { score: Math.round((present / checks.length) * 100), missing };
}
