import Link from "next/link";
import { db } from "@/lib/db";
import SubmissionsModeration from "@/app/(admin)/admin/_components/SubmissionsModeration";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";

export const dynamic = "force-dynamic";

const allowedStatuses = ["SUBMITTED", "APPROVED", "REJECTED"] as const;
type StatusFilter = (typeof allowedStatuses)[number];
const allowedTypes = ["EVENT", "VENUE", "ARTIST"] as const;
type TypeFilter = (typeof allowedTypes)[number] | "ALL";

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolved = await searchParams;
  const inputStatus = typeof resolved.status === "string" ? resolved.status : "SUBMITTED";
  const status: StatusFilter = allowedStatuses.includes(inputStatus as StatusFilter) ? (inputStatus as StatusFilter) : "SUBMITTED";
  const inputType = typeof resolved.type === "string" ? resolved.type : "ALL";
  const type: TypeFilter = inputType === "ALL" || allowedTypes.includes(inputType as (typeof allowedTypes)[number]) ? (inputType as TypeFilter) : "ALL";

  const items = await db.submission.findMany({
    where: { status, ...(type === "ALL" ? {} : { type }) },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      submitter: { select: { email: true, name: true } },
      venue: { select: { id: true, name: true } },
      targetEvent: { select: { id: true, title: true, slug: true } },
      targetVenue: { select: { id: true, name: true, slug: true } },
      targetArtist: { select: { id: true, name: true, slug: true } },
    },
  });

  return (
    <main className="p-6 space-y-3">
      <AdminPageHeader
        title="Submissions"
        description="Approve, reject, or request changes for submitted content."
      />
      <div className="flex gap-2 text-sm">
        {allowedStatuses.map((s) => (
          <Link key={s} href={`/admin/submissions?status=${s}&type=${type}`} className={`rounded border px-3 py-1 ${s === status ? "bg-neutral-100" : ""}`}>
            {s[0]}{s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 text-sm">
        {["ALL", ...allowedTypes].map((t) => (
          <Link key={t} href={`/admin/submissions?status=${status}&type=${t}`} className={`rounded border px-3 py-1 ${t === type ? "bg-neutral-100" : ""}`}>
            {t}
          </Link>
        ))}
      </div>
      <SubmissionsModeration
        items={items.map((item) => ({
          id: item.id,
          status: item.status,
          type: item.type,
          note: item.note,
          decisionReason: item.decisionReason,
          submittedAt: item.submittedAt?.toISOString() ?? null,
          decidedAt: item.decidedAt?.toISOString() ?? null,
          submitter: item.submitter,
          venue: item.venue,
          targetEvent: item.targetEvent,
          targetVenue: item.targetVenue,
          targetArtist: item.targetArtist,
        }))}
      />
    </main>
  );
}
