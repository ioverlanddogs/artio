import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { CreateVenueForm } from "@/app/my/venues/_components/CreateVenueForm";

export default async function CreateVenuePage() {
  const user = await getSessionUser();
  if (!user) return redirectToLogin("/my/venues/new");

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Create a venue</h1>
      <p className="text-sm text-muted-foreground">Start with the basics — you can add photos, location, and details next.</p>
      <CreateVenueForm showTopSubmit mode="quickstart" />
    </main>
  );
}
