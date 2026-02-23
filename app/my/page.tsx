import Link from "next/link";
import { redirectToLogin } from "@/lib/auth-redirect";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MyDashboardClient } from "@/components/my/my-dashboard-client";
import { RequestPublisherAccessCard } from "@/components/my/request-publisher-access-card";

export default async function MyDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my");

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Publisher Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your creator hub for artworks, events, and performance.</p>
        </div>
        {user.role === "USER" ? null : (
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/my/artwork/new">+ Add artwork</Link></Button>
            <Button asChild><Link href="/my/events/new">+ Create event</Link></Button>
            <Button asChild variant="secondary"><Link href="/my/venues/new">+ Create venue</Link></Button>
            <Button asChild variant="secondary"><Link href="/my/analytics">View analytics</Link></Button>
          </div>
        )}
      </div>
      {user.role === "USER" ? <RequestPublisherAccessCard email={user.email} /> : null}
      <MyDashboardClient />
    </main>
  );
}
