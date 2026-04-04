import { getSessionUser } from "@/lib/auth";
import { redirectToLogin } from "@/lib/auth-redirect";
import { db } from "@/lib/db";
import { NotificationPrefsForm } from "./notification-prefs-form";

export default async function MySettingsPage() {
  const user = await getSessionUser();
  if (!user) return redirectToLogin("/my/settings");

  const prefs = await db.userNotificationPrefs.findUnique({
    where: { userId: user.id },
    select: { emailOnSubmissionResult: true, emailOnTeamInvite: true, weeklyDigest: true },
  }).catch(() => null);
  const initialPrefs = {
    emailOnSubmissionResult: prefs?.emailOnSubmissionResult ?? true,
    emailOnTeamInvite: prefs?.emailOnTeamInvite ?? true,
    weeklyDigest: prefs?.weeklyDigest ?? false,
  };

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Publisher preferences and notification settings.</p>
      </header>

      <section className="space-y-3 rounded border p-4">
        <div>
          <h2 className="text-lg font-medium">Notifications</h2>
          <p className="text-sm text-muted-foreground">Control which emails you receive from Artpulse.</p>
        </div>
        <NotificationPrefsForm initialPrefs={initialPrefs} />
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="text-lg font-medium">Default venue</h2>
        <p className="text-sm text-muted-foreground">Planned: choose a default venue for dashboard filters and quick actions.</p>
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="text-lg font-medium">Publishing preferences</h2>
        <p className="text-sm text-muted-foreground">Planned: set publishing defaults for new events, venues, and artwork drafts.</p>
      </section>
    </main>
  );
}
