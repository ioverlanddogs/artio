import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import RegionsClient from "@/app/(admin)/admin/ingest/regions/regions-client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listIngestRegions, type RegionsListPayload } from "@/lib/ingest/regions-list";

export default async function AdminIngestRegionsPage() {
  await requireAdmin();

  let payload: RegionsListPayload;
  try {
    payload = await listIngestRegions({ db, page: 1, pageSize: 20 });
  } catch {
    payload = { regions: [], total: 0, page: 1, pageSize: 20 };
  }

  return (
    <>
      <AdminPageHeader
        title="Region Queue"
        description="Add a country and region to queue autonomous venue discovery and event ingestion."
      />
      <RegionsClient initial={payload} />
    </>
  );
}
