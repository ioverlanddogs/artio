import { headers } from "next/headers";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import RegionsClient, {
  type RegionListResponse,
} from "@/app/(admin)/admin/ingest/regions/regions-client";
import { requireAdmin } from "@/lib/auth";

export default async function AdminIngestRegionsPage() {
  await requireAdmin();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const response = await fetch(
    `${protocol}://${host}/api/admin/ingest/regions`,
    {
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    },
  );

  const payload = response.ok
    ? ((await response.json()) as RegionListResponse)
    : { regions: [], total: 0, page: 1, pageSize: 20 };

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
