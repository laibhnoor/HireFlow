"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { updateApplicationStatusAction } from "@/app/(app)/applications/actions";
import { Select } from "@/components/ui/select";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatusValue,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

export function ApplicationStatusSelect({
  applicationId,
  status,
  className,
  compact = false,
}: {
  applicationId: string;
  status: string;
  className?: string;
  compact?: boolean;
}) {
  const [current, setCurrent] = React.useState(status);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setCurrent(status);
  }, [status]);

  function change(next: string) {
    const previous = current;
    setCurrent(next);
    setError(null);

    startTransition(async () => {
      const result = await updateApplicationStatusAction(
        applicationId,
        next,
      );
      if (!result.ok) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        aria-label="Application status"
        value={current}
        onChange={(event) => change(event.target.value)}
        disabled={pending}
        className={cn(
          compact ? "h-8 w-full min-w-32 text-xs" : "h-9 w-full min-w-36 text-sm",
          pending && "opacity-70",
        )}
      >
        {APPLICATION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value as ApplicationStatusValue]}
          </option>
        ))}
      </Select>
      {pending ? (
        <Loader2
          className="pointer-events-none absolute right-7 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      {error ? (
        <p role="status" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
