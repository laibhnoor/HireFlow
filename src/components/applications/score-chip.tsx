import { cn } from "@/lib/utils";

export function ScoreChip({
  score,
  className,
}: {
  score?: number | null;
  className?: string;
}) {
  if (typeof score !== "number") {
    return (
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        —
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums",
        clamped >= 75
          ? "bg-success/12 text-success"
          : clamped >= 50
            ? "bg-warning/15 text-warning-foreground dark:text-warning"
            : "bg-destructive/10 text-destructive",
        className,
      )}
      aria-label={`Match score ${clamped} out of 100`}
    >
      {clamped}
    </span>
  );
}
