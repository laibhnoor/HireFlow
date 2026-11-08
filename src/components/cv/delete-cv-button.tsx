"use client";

import { Trash2 } from "lucide-react";

import { deleteCvAction } from "@/app/(app)/cv/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteCvButton({
  cvId,
  fromDetail = false,
  className,
}: {
  cvId: string;
  fromDetail?: boolean;
  className?: string;
}) {
  return (
    <form
      action={deleteCvAction}
      className={cn("inline-flex", className)}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Delete this CV? Its extracted text, search index and any analyses built from it will be removed.",
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="cvId" value={cvId} />
      {fromDetail ? <input type="hidden" name="fromDetail" value="1" /> : null}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 aria-hidden />
        Delete
      </Button>
    </form>
  );
}
