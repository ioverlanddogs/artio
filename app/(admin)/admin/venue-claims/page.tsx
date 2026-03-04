import AdminPageHeader from "../_components/AdminPageHeader";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export default async function AdminVenueClaimsPage() {
  const claims = await db.venueClaimRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { venue: { select: { id: true, name: true, slug: true } }, user: { select: { email: true } } },
  });

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Venue Claims" description="Review manual-review and verification claim requests." />
      <div className="rounded-lg border bg-background p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground"><th>Venue</th><th>User</th><th>Status</th><th>Role</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t">
                <td className="py-2">{claim.venue.name}</td>
                <td>{claim.user.email}</td>
                <td>{claim.status}</td>
                <td>{claim.roleAtVenue}</td>
                <td>{claim.createdAt.toLocaleString()}</td>
                <td>
                  {claim.status === "PENDING_VERIFICATION" ? (
                    <div className="flex gap-2">
                      <form method="POST" action={`/api/admin/venue-claims/${claim.id}/approve`}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs text-green-700 hover:bg-green-50">
                          Approve
                        </button>
                      </form>
                      <form method="POST" action={`/api/admin/venue-claims/${claim.id}/reject`}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{claim.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
