import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  type ApplicationStatusValue,
} from "@/lib/applications/status";

export function ApplicationStatusBadge({ status }: { status: string }) {
  const value = status as ApplicationStatusValue;

  return (
    <Badge variant={STATUS_VARIANTS[value] ?? "outline"}>
      {STATUS_LABELS[value] ?? status}
    </Badge>
  );
}
