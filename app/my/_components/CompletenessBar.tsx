type CompletenessBarProps = {
  percent: number;
  missing?: string[];
};

export default function CompletenessBar({ percent, missing = [] }: CompletenessBarProps) {
  const bounded = Math.max(0, Math.min(100, Math.round(percent)));
  const topMissing = missing.slice(0, 3);

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${bounded}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{bounded}% complete</p>
      {topMissing.length > 0 ? (
        <p className="text-xs text-muted-foreground">Missing: {topMissing.join(", ")}</p>
      ) : null}
    </div>
  );
}
