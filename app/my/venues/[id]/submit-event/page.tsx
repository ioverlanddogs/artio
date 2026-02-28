import { redirect } from "next/navigation";

export default async function SubmitEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = new URLSearchParams();
  query.set("venueId", id);

  const resolvedSearchParams = (await searchParams) ?? {};
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key === "venueId") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) query.append(key, item);
      }
    } else if (value != null) {
      query.set(key, value);
    }
  }

  redirect(`/my/events?${query.toString()}`);
}
