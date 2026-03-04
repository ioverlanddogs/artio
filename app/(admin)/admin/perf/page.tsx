import Link from "next/link";
import PerfAdminClient from "@/app/(admin)/admin/perf/perf-admin-client";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPerfPage() {
  await requireAdmin();

  return (
    <main className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Performance Diagnostics</h1>
        <p className="text-sm text-neutral-600">Run admin-only EXPLAIN snapshots on whitelisted read-only queries.</p>
        <Link className="underline text-sm" href="/admin">Back to Admin</Link>
      </div>
      <PerfAdminClient />
    </main>
  );
}
