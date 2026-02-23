import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { CreateVenueForm } from "@/app/my/venues/_components/CreateVenueForm";

export default async function CreateVenuePage() {
  const user = await getSessionUser();
  if (!user) redirectToLogin("/my/venues/new");

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Create venue</h1>
      <p className="text-sm text-muted-foreground">Create a draft venue profile and continue editing it from your venue dashboard.</p>
      <CreateVenueForm showTopSubmit />
    </main>
  );
}
