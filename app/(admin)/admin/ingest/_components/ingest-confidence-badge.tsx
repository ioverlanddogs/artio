import { Badge } from "@/components/ui/badge";

type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

const classMap: Record<ConfidenceBand, string> = {
  HIGH: "bg-green-100 text-green-900 hover:bg-green-100",
  MEDIUM: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  LOW: "bg-rose-100 text-rose-900 hover:bg-rose-100",
};

export default function IngestConfidenceBadge({
  score,
  band,
  reasons,
  showReasons = false,
}: {
  score: number;
  band: ConfidenceBand;
  reasons?: string[] | null;
  showReasons?: boolean;
}) {
  const visibleReasons = reasons?.slice(0, 4) ?? [];
  const tooltip = !showReasons && reasons?.length ? reasons.join(" • ") : undefined;

  return (
    <div className="space-y-1">
      <Badge className={classMap[band]} title={tooltip}>{band} {score}</Badge>
      {showReasons && visibleReasons.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {visibleReasons.map((reason, index) => <div key={`${reason}-${index}`}>• {reason}</div>)}
        </div>
      ) : null}
    </div>
  );
}
