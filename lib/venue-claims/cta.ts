export function shouldShowVenueClaimCta(args: {
  claimStatus: "UNCLAIMED" | "PENDING" | "CLAIMED";
  aiGenerated: boolean;
  membershipsCount: number;
  isCurrentUserMember: boolean;
}) {
  if (args.claimStatus === "CLAIMED") return false;
  if (!(args.aiGenerated || args.membershipsCount === 0)) return false;
  if (args.isCurrentUserMember) return false;
  return true;
}
