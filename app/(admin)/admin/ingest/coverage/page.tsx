import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import { CoverageClient } from "@/app/(admin)/admin/ingest/coverage/coverage-client";
import { db } from "@/lib/db";
import { getRegionCoverageData } from "@/lib/discovery/coverage-query";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const rows = await getRegionCoverageData(db);

  return (
    <>
      <AdminPageHeader
        title="Discovery Coverage"
        description="Venue and event density by region, with active goal progress."
      />
      <CoverageClient rows={rows} />
    </>
  );
}
