import { handleEventIcalGet } from "@/lib/calendar/event-ical-route";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleEventIcalGet(params);
}
