import { ADMIN_IMAGE_ALT_REQUIRED } from "@/lib/admin-policy";
import EventAdminForm from "@/app/(admin)/admin/_components/EventAdminForm";

export default function AdminNewEvent() {
  return (
    <div className="space-y-4">
      <EventAdminForm title="New Event" endpoint="/api/admin/events" method="POST" initial={{ timezone: "UTC", tagSlugs: [], artistSlugs: [] }} altRequired={ADMIN_IMAGE_ALT_REQUIRED} />
      <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        New events are created as Draft. After saving, complete all required fields and use the Approve button on the edit page to publish.
      </p>
    </div>
  );
}
