"use client";

import Link from "next/link";

type Props = {
  totalPublished: number;
  totalWithImages: number;
  totalScored: number;
  avgScore: number;
  pctWithImages: number;
  pctScored: number;
  scoredLast24h: number;
  recentlyEnriched: number;
  flagBreakdown: Array<{ flag: string; count: number }>;
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
};

function statToneByThreshold(value: number, good: number, warn: number) {
  if (value >= good) return "text-emerald-700";
  if (value >= warn) return "text-amber-700";
  return "text-rose-700";
}

function scoreDistributionBar({ high, medium, low }: Props["distribution"]) {
  const total = high + medium + low;
  if (total === 0) return null;

  const highPct = Math.round((high / total) * 100);
  const mediumPct = Math.round((medium / total) * 100);
  const lowPct = 100 - highPct - mediumPct;

  return (
    <div className="space-y-1 rounded-lg border bg-background p-4">
      <h2 className="text-sm font-semibold">Completeness distribution</h2>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {highPct > 0 ? (
          <div className="bg-emerald-500" style={{ width: `${highPct}%` }} title={`≥80: ${high} (${highPct}%)`} />
        ) : null}
        {mediumPct > 0 ? (
          <div className="bg-amber-400" style={{ width: `${mediumPct}%` }} title={`60-79: ${medium} (${mediumPct}%)`} />
        ) : null}
        {lowPct > 0 ? (
          <div className="bg-rose-400" style={{ width: `${lowPct}%` }} title={`<60: ${low} (${lowPct}%)`} />
        ) : null}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="text-emerald-700">{highPct}% ≥80</span>
        <span className="text-amber-700">{mediumPct}% 60-79</span>
        <span className="text-rose-700">{lowPct}% &lt;60</span>
      </div>
    </div>
  );
}

export default function QualityClient(props: Props) {
  if (props.totalScored === 0) {
    return (
      <div className="rounded-lg border bg-background p-10 text-center text-sm text-muted-foreground">
        No artworks have been scored yet. Trigger the scoring cron at{" "}
        <a href="/api/cron/artworks/score-completeness" className="underline">
          /api/cron/artworks/score-completeness
        </a>{" "}
        to populate this view.
      </div>
    );
  }

  const imageTone = statToneByThreshold(props.pctWithImages, 95, 80);
  const avgScoreTone = statToneByThreshold(props.avgScore, 80, 60);

  const flagLabels: Record<string, string> = {
    MISSING_IMAGE: "Missing image",
    LOW_CONFIDENCE_METADATA: "Low confidence",
    INCOMPLETE: "Incomplete",
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">% with images</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${imageTone}`}>{props.pctWithImages}%</p>
          <p className="text-xs text-muted-foreground">{props.totalWithImages} of {props.totalPublished}</p>
        </article>
        <article className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Avg completeness score</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${avgScoreTone}`}>{props.avgScore}</p>
          <p className="text-xs text-muted-foreground">Across scored artworks</p>
        </article>
        <article className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Artworks scored</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">{props.totalScored}</p>
          <p className="text-xs text-muted-foreground">{props.pctScored}% of published</p>
        </article>
        <article className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Scored last 24h</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">{props.scoredLast24h}</p>
          <p className="text-xs text-muted-foreground">Descriptions refreshed: {props.recentlyEnriched}</p>
        </article>
      </section>

      {scoreDistributionBar(props.distribution)}

      <section className="rounded-lg border bg-background p-4">
        <h2 className="mb-3 text-sm font-semibold">Completeness flags</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Flag</th>
                <th className="px-3 py-2">Count</th>
                <th className="px-3 py-2">% of published</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {props.flagBreakdown.map((row) => {
                const pct = props.totalPublished > 0 ? Math.round((row.count / props.totalPublished) * 100) : 0;
                return (
                  <tr key={row.flag} className="border-b">
                    <td className="px-3 py-2">{flagLabels[row.flag] ?? row.flag}</td>
                    <td className="px-3 py-2 tabular-nums">{row.count}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{pct}%</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/ingest/data-gaps?flag=${row.flag}`} className="underline text-muted-foreground">
                        → Data Gaps
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-4">
        <h2 className="mb-3 text-sm font-semibold">Enrichment crons</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Score completeness</span>
            <a href="/api/cron/artworks/score-completeness" className="text-xs text-muted-foreground underline">Trigger manually →</a>
          </div>
          <div className="flex items-center justify-between">
            <span>Normalize fields</span>
            <a href="/api/cron/artworks/normalize-fields" className="text-xs text-muted-foreground underline">Trigger manually →</a>
          </div>
          <div className="flex items-center justify-between">
            <span>Recover images</span>
            <a href="/api/cron/artworks/recover-images" className="text-xs text-muted-foreground underline">Trigger manually →</a>
          </div>
          <div className="flex items-center justify-between">
            <span>Enrich descriptions</span>
            <a href="/api/cron/artworks/enrich-descriptions" className="text-xs text-muted-foreground underline">Trigger manually →</a>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          These crons also run automatically via the DB scheduler. Trigger manually to populate the view
          immediately after first deploy.
        </p>
      </section>
    </div>
  );
}
