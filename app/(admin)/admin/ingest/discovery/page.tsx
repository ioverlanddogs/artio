import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import DiscoveryClient from "@/app/(admin)/admin/ingest/discovery/discovery-client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listDiscoveryJobs, type DiscoveryListPayload } from "@/lib/ingest/discovery-list";

export default async function AdminIngestDiscoveryPage() {
  await requireAdmin();

  let payload: DiscoveryListPayload;
  try {
    payload = await listDiscoveryJobs({ db, page: 1, pageSize: 20 });
  } catch {
    payload = { jobs: [], total: 0, page: 1, pageSize: 20 };
  }

  return (
    <>
      <AdminPageHeader
        title="Search Discovery"
        description="Run search-grounded discovery jobs to seed ingest with new venue and artist URLs."
      />
      <DiscoveryClient initial={payload} />
    </>
  );
}
