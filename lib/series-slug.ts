const RESERVED_SLUGS = new Set(["new", "edit", "import", "export"]);

function normalizeSlugSegment(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function slugifySeriesTitle(title: string) {
  const normalized = normalizeSlugSegment(title);
  if (!normalized) return "series";
  if (RESERVED_SLUGS.has(normalized)) return `series-${normalized}`;
  return normalized;
}

export async function ensureUniqueSeriesSlugWithDeps(
  deps: { findBySlug: (slug: string) => Promise<{ id: string } | null> },
  baseSlug: string,
  excludeId?: string,
) {
  let normalizedBase = normalizeSlugSegment(baseSlug) || "series";
  if (RESERVED_SLUGS.has(normalizedBase)) normalizedBase = `series-${normalizedBase}`;

  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const existing = await deps.findBySlug(candidate);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
}
