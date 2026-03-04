import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EntityHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  imageUrl?: string | null;
  coverUrl?: string | null;
  tags?: string[];
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  meta?: ReactNode;
};

export function EntityHeader({ title, subtitle, imageUrl, coverUrl, tags = [], primaryAction, secondaryAction, meta }: EntityHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[16/5] min-h-24 bg-gradient-to-r from-indigo-500/50 via-fuchsia-500/40 to-cyan-400/40">
        {coverUrl ? <Image src={coverUrl} alt={`${title} cover`} fill className="object-cover" sizes="100vw" /> : null}
      </div>
      <div className="-mt-10 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted md:h-24 md:w-24">
              {imageUrl ? <Image src={imageUrl} alt={title} fill className="object-cover" sizes="96px" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              {meta ? <div className="pt-1">{meta}</div> : null}
            </div>
          </div>
          {(primaryAction || secondaryAction) ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{primaryAction}{secondaryAction}</div> : null}
        </div>
        {tags.length ? <div className={cn("mt-4 flex flex-wrap gap-2")}>{tags.slice(0, 6).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div> : null}
      </div>
    </header>
  );
}
