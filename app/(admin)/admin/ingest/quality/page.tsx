import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import { db } from "@/lib/db";
import QualityClient from "./quality-client";

export const dynamic = "force-dynamic";

export default async function AdminIngestQualityPage() {
  const [
    totalPublished,
    totalWithImages,
    totalScored,
    avgScoreResult,
    flagBreakdown,
    scoredLast24h,
    recentlyEnriched,
    highScoreCount,
    mediumScoreCount,
    lowScoreCount,
  ] = await Promise.all([
    db.artwork.count({
      where: { isPublished: true, deletedAt: null },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        featuredAssetId: { not: null },
      },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessUpdatedAt: { not: null },
      },
    }),
    db.artwork.aggregate({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessUpdatedAt: { not: null },
      },
      _avg: { completenessScore: true },
    }),
    Promise.all(
      ["MISSING_IMAGE", "LOW_CONFIDENCE_METADATA", "INCOMPLETE"].map(async (flag) => ({
        flag,
        count: await db.artwork.count({
          where: {
            isPublished: true,
            deletedAt: null,
            completenessFlags: { has: flag },
          },
        }),
      })),
    ),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessUpdatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        description: { not: null },
        completenessUpdatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessScore: { gte: 80 },
      },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessScore: { gte: 60, lt: 80 },
      },
    }),
    db.artwork.count({
      where: {
        isPublished: true,
        deletedAt: null,
        completenessScore: { lt: 60 },
      },
    }),
  ]);

  const avgScore = Math.round(avgScoreResult._avg.completenessScore ?? 0);
  const pctWithImages = totalPublished > 0 ? Math.round((totalWithImages / totalPublished) * 100) : 0;
  const pctScored = totalPublished > 0 ? Math.round((totalScored / totalPublished) * 100) : 0;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Quality Overview"
        description="Published artwork completeness, enrichment throughput, and data quality flags."
      />

      <QualityClient
        totalPublished={totalPublished}
        totalWithImages={totalWithImages}
        totalScored={totalScored}
        avgScore={avgScore}
        pctWithImages={pctWithImages}
        pctScored={pctScored}
        scoredLast24h={scoredLast24h}
        recentlyEnriched={recentlyEnriched}
        flagBreakdown={flagBreakdown}
        distribution={{
          high: highScoreCount,
          medium: mediumScoreCount,
          low: lowScoreCount,
        }}
      />
    </div>
  );
}
