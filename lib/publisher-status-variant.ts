export function publisherStatusVariant(
  status: string,
): "default" | "destructive" | "secondary" | "outline" {
  if (status === "Published" || status === "Live") return "default";
  if (status === "Rejected") return "destructive";
  if (status === "Submitted" || status === "Under review") return "secondary";
  return "outline";
}
