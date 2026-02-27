import { Badge } from "@/components/ui/badge";

type IngestStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
type CandidateStatus = "PENDING" | "APPROVED" | "REJECTED";

const statusClassMap: Record<IngestStatus | CandidateStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  RUNNING: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  SUCCEEDED: "bg-green-100 text-green-900 hover:bg-green-100",
  FAILED: "bg-red-100 text-red-900 hover:bg-red-100",
  APPROVED: "bg-green-100 text-green-900 hover:bg-green-100",
  REJECTED: "bg-neutral-200 text-neutral-900 hover:bg-neutral-200",
};

export default function IngestStatusBadge({ status }: { status: IngestStatus | CandidateStatus }) {
  return <Badge className={statusClassMap[status]}>{status}</Badge>;
}
