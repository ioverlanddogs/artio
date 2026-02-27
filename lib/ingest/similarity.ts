import { createHash } from "node:crypto";

type SimilarityCandidate = {
  id: string;
  venueId: string;
  title: string;
  startAt: Date | null;
  locationText: string | null;
  similarityKey?: string;
};

type ClusterAssignment = {
  id: string;
  similarityKey: string;
  clusterKey: string;
  duplicateOfId: string | null;
  similarityScore: number | null;
  isPrimary: boolean;
};

const STOPWORDS = new Set(["the", "a", "an", "and", "of", "at", "for", "to", "in", "on"]);

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token))
    .join(" ");
}

function dateBucket(input: Date | null): string {
  return input ? input.toISOString().slice(0, 10) : "unknown";
}

function locationPrefix(input: string | null): string {
  if (!input) return "";
  const tokens = tokenize(input).slice(0, 2);
  return tokens.join(" ");
}

export function computeSimilarityKey(candidate: { title: string; startAt: Date | null; locationText: string | null }): string {
  const titleTokens = tokenize(candidate.title).sort().join(" ");
  const signature = `${titleTokens}|${dateBucket(candidate.startAt)}|${locationPrefix(candidate.locationText)}`;
  return createHash("sha256").update(signature).digest("hex");
}

function tokenJaccard(a: string[], b: string[]): number {
  const aSet = new Set(a);
  const bSet = new Set(b);
  const intersection = [...aSet].filter((value) => bSet.has(value)).length;
  const union = new Set([...aSet, ...bSet]).size;
  if (union === 0) return 0;
  return intersection / union;
}

export function scoreSimilarity(
  a: { title: string; startAt: Date | null; locationText: string | null },
  b: { title: string; startAt: Date | null; locationText: string | null },
): number {
  const titleTokensA = tokenize(a.title);
  const titleTokensB = tokenize(b.title);
  const titleScore = tokenJaccard(titleTokensA, titleTokensB);
  const locationScore = tokenJaccard(tokenize(a.locationText ?? ""), tokenize(b.locationText ?? ""));
  const dayA = dateBucket(a.startAt);
  const dayB = dateBucket(b.startAt);

  let score = Math.round(titleScore * 70);
  const titleSetB = new Set(titleTokensB);
  const overlapCount = titleTokensA.filter((token) => titleSetB.has(token)).length;
  const minTokenLength = Math.max(1, Math.min(titleTokensA.length, titleTokensB.length));
  if (overlapCount / minTokenLength >= 0.8) score += 15;
  if (dayA === dayB && dayA !== "unknown") score += 20;
  if (dayA !== dayB && dayA !== "unknown" && dayB !== "unknown") score -= 15;
  score += Math.round(locationScore * 10);

  return Math.max(0, Math.min(100, score));
}

function similarityThreshold(): number {
  const parsed = Number.parseInt(process.env.AI_INGEST_DUPLICATE_SIMILARITY_THRESHOLD ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 100) return parsed;
  return 85;
}

export function clusterCandidates(candidates: SimilarityCandidate[]): { assignments: ClusterAssignment[] } {
  const threshold = similarityThreshold();
  const sorted = [...candidates].sort((a, b) => {
    const byVenue = a.venueId.localeCompare(b.venueId);
    if (byVenue !== 0) return byVenue;
    const byDate = dateBucket(a.startAt).localeCompare(dateBucket(b.startAt));
    if (byDate !== 0) return byDate;
    const byTitle = normalizeText(a.title).localeCompare(normalizeText(b.title));
    if (byTitle !== 0) return byTitle;
    return a.id.localeCompare(b.id);
  });

  type Cluster = { primary: SimilarityCandidate; clusterKey: string };
  const clustersByGroup = new Map<string, Cluster[]>();
  const assignments: ClusterAssignment[] = [];

  for (const candidate of sorted) {
    const groupKey = `${candidate.venueId}|${dateBucket(candidate.startAt)}`;
    const similarityKey = candidate.similarityKey ?? computeSimilarityKey(candidate);
    const clusters = clustersByGroup.get(groupKey) ?? [];

    let matchedCluster: Cluster | null = null;
    let matchedScore: number | null = null;
    for (const cluster of clusters) {
      const score = scoreSimilarity(candidate, cluster.primary);
      if (score >= threshold) {
        matchedCluster = cluster;
        matchedScore = score;
        break;
      }
    }

    if (!matchedCluster) {
      const clusterKey = createHash("sha256").update(`cluster|${groupKey}|${similarityKey}`).digest("hex");
      const newCluster: Cluster = { primary: candidate, clusterKey };
      clusters.push(newCluster);
      clustersByGroup.set(groupKey, clusters);
      assignments.push({
        id: candidate.id,
        similarityKey,
        clusterKey,
        duplicateOfId: null,
        similarityScore: null,
        isPrimary: true,
      });
      continue;
    }

    assignments.push({
      id: candidate.id,
      similarityKey,
      clusterKey: matchedCluster.clusterKey,
      duplicateOfId: matchedCluster.primary.id,
      similarityScore: matchedScore,
      isPrimary: false,
    });
  }

  return { assignments };
}
