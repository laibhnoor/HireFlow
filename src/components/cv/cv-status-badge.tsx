import { Badge } from "@/components/ui/badge";

export function CvStatusBadge({ status }: { status: string }) {
  if (status === "READY") return <Badge variant="success">Ready</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing</Badge>;
}
