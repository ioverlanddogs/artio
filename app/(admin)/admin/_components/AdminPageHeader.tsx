import Link from "next/link";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
};

export default function AdminPageHeader({ title, description, backHref, backLabel, right }: AdminPageHeaderProps) {
  return (
    <header className="space-y-2">
      {backHref && backLabel ? (
        <Link href={backHref} className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

export type { AdminPageHeaderProps };
