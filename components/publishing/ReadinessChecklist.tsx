import Link from "next/link";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  label: string;
  complete: boolean;
  fixHref?: string;
};

export function ReadinessChecklist({ title = "Readiness checklist", items }: { title?: string; items: ChecklistItem[] }) {
  return (
    <section aria-label={title} className="rounded-lg border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span>{item.label}</span>
            <span className="flex items-center gap-2">
              {!item.complete && item.fixHref ? (
                <Link href={item.fixHref} className="text-xs underline text-muted-foreground">
                  Fix
                </Link>
              ) : null}
              <span className={cn("font-medium", item.complete ? "text-emerald-600" : "text-amber-700")}>
                {item.complete ? "✓" : "⚠"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
