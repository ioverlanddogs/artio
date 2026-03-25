import { Button } from "@/components/ui/button";

type ErrorCardProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorCard({ title = "Something went wrong", message, onRetry }: ErrorCardProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive-foreground" role="alert">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm opacity-90">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
