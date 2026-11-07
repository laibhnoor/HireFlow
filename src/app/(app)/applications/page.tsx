import type { Metadata } from "next";
import { BriefcaseBusiness } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Applications",
};

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader
        title="Applications"
        description="Every role you're pursuing, from saved to offer."
        actions={<Badge variant="secondary">0 total</Badge>}
      />

      <EmptyState
        icon={BriefcaseBusiness}
        title="No applications yet"
        description="Analyse a job description and it will be tracked here, together with its score, documents and interview prep."
      />
    </>
  );
}
