import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "CV library",
};

export default function CvPage() {
  return (
    <>
      <PageHeader
        title="CV library"
        description="The source of truth for every analysis. Upload once, reuse across applications."
        actions={<Badge variant="secondary">0 CVs</Badge>}
      />

      <EmptyState
        icon={FileText}
        title="No CVs yet"
        description="Add a PDF, DOCX or plain-text CV to index your experience. Your first CV becomes the default for new analyses."
      />
    </>
  );
}
