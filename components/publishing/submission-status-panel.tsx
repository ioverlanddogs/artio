import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStatusUiLabel, type LifecycleStatus } from "@/lib/submission-lifecycle";

type Action = { label: string; disabled?: boolean; onClick?: () => void; href?: string };

export function SubmissionStatusPanel(props: {
  entityType: "artist" | "venue" | "event";
  status: LifecycleStatus | null;
  submittedAtISO?: string | null;
  reviewedAtISO?: string | null;
  rejectionReason?: string | null;
  primaryAction: Action;
  secondaryAction?: Action;
  publicHref?: string | null;
  readiness: { ready: boolean; blocking: Array<{ id: string; label: string }>; warnings: Array<{ id: string; label: string }> };
}) {
  const statusLabel = getStatusUiLabel(props.status);
  const stamp = props.reviewedAtISO ?? props.submittedAtISO;

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="font-semibold">Submission</h2>
      <p className="text-sm">Status: <span className="font-medium">{statusLabel}</span></p>
      {stamp ? <p className="text-sm text-neutral-600">Updated: {new Date(stamp).toLocaleString()}</p> : null}
      {props.status === "REJECTED" && props.rejectionReason ? <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">Feedback: {props.rejectionReason}</div> : null}
      {props.publicHref ? <p className="text-sm text-emerald-700">Live now: <Link href={props.publicHref} className="underline">View public page</Link></p> : null}

      {!props.readiness.ready ? (
        <p className="text-sm text-amber-800">Complete readiness checklist before submitting.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {props.primaryAction.href ? (
          <Button asChild variant="outline" size="sm">
            <Link href={props.primaryAction.href}>{props.primaryAction.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={props.primaryAction.onClick} disabled={props.primaryAction.disabled}>{props.primaryAction.label}</Button>
        )}
        {props.secondaryAction ? <Button variant="outline" size="sm" onClick={props.secondaryAction.onClick} disabled={props.secondaryAction.disabled}>{props.secondaryAction.label}</Button> : null}
      </div>
    </section>
  );
}
