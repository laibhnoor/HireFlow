import { FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="relative grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <FileCheck2 className="size-4.5" strokeWidth={2.25} aria-hidden />
        <span className="absolute inset-0 rounded-lg inset-ring-1 inset-ring-white/15" />
      </span>
      {showWordmark ? (
        <span className="text-[17px]">
          Hire<span className="text-primary">Flow</span>
        </span>
      ) : null}
    </span>
  );
}
