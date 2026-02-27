import { Badge } from "@/components/ui/badge";

type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

const classMap: Record<ConfidenceBand, string> = {
  HIGH: "bg-green-100 text-green-900 hover:bg-green-100",
  MEDIUM: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  LOW: "bg-rose-100 text-rose-900 hover:bg-rose-100",
};

export default function IngestConfidenceBadge({ score, band, reasons }: { score: number; band: ConfidenceBand; reasons?: string[] | null }) {
  const tooltip = reasons?.length ? reasons.join(" • ") : undefined;
  return <Badge className={classMap[band]} title={tooltip}>{band} {score}</Badge>;
}
