import { AccessRequestsClient } from "./access-requests-client";

export const dynamic = "force-dynamic";

export default function AdminAccessRequestsPage() {
  return (
    <main className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Access requests</h1>
        <p className="text-sm text-muted-foreground">Review and process pending publisher/admin access requests.</p>
      </div>
      <AccessRequestsClient />
    </main>
  );
}
