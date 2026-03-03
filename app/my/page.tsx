import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getMyDashboard } from "@/lib/my/dashboard/get-my-dashboard";
import NeedsAttentionPanel from "@/app/my/_components/NeedsAttentionPanel";
import StatusTileGroups from "@/app/my/_components/StatusTileGroups";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ venueId?: string }>;

export default async function MyDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my");

  const params = await searchParams;
  const rawVenueId = params.venueId;
  const venueId = rawVenueId && rawVenueId.trim().length > 0 ? rawVenueId : undefined;

  const data = await getMyDashboard({ userId: user.id, venueId });

  return (
    <main className="space-y-6 p-6">
      <NeedsAttentionPanel attention={data.attention} />
      <StatusTileGroups counts={data.counts} venueId={venueId} />
    </main>
  );
}
