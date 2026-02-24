import AdminPageHeader from "./_components/AdminPageHeader";
import { db } from "@/lib/db";

async function getDbHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return "ok" as const;
  } catch {
    return "fail" as const;
  }
}

async function getCounts() {
  try {
    const [users, artists, venues, events] = await Promise.all([
      db.user.count(),
      db.artist.count(),
      db.venue.count(),
      db.event.count(),
    ]);
    return { users, artists, venues, events };
  } catch {
    return { users: null, artists: null, venues: null, events: null };
  }
}

function StatCard({ label, value }: { label: string; value: number | string | null }) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value ?? "—"}</p>
    </article>
  );
}

export default async function AdminHomePage() {
  const [dbHealth, counts] = await Promise.all([getDbHealth(), getCounts()]);

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Dashboard" description="Operational overview for administrators." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="DB health" value={dbHealth} />
        <StatCard label="Users" value={counts.users} />
        <StatCard label="Artists" value={counts.artists} />
        <StatCard label="Venues" value={counts.venues} />
        <StatCard label="Events" value={counts.events} />
      </div>
    </main>
  );
}
