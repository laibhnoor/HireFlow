import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin, Plus } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ScoreChip } from "@/components/applications/score-chip";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const user = await requireUser();

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      job: { select: { company: true, title: true, location: true } },
      cv: { select: { title: true } },
      analysis: { select: { overallScore: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every role you're pursuing, with its evidence-backed match score."
        actions={
          <>
            <Badge variant="secondary">
              {applications.length} total
            </Badge>
            <Link href="/applications/new" className={buttonVariants()}>
              <Plus aria-hidden />
              Analyse a job
            </Link>
          </>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No applications yet"
          description="Paste a job description and HireFlow will extract its requirements, score your CV against them, and cite the evidence behind every verdict."
          action={
            <Link href="/applications/new" className={buttonVariants()}>
              <Plus aria-hidden />
              Analyse your first job
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                <ScoreChip score={application.analysis?.overallScore} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/applications/${application.id}`}
                      className="truncate text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      {application.job.title}
                    </Link>
                    <ApplicationStatusBadge status={application.status} />
                  </div>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {application.job.company}
                    {application.job.location ? (
                      <>
                        {" · "}
                        <MapPin className="inline size-3 -translate-y-px" aria-hidden />{" "}
                        {application.job.location}
                      </>
                    ) : null}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    CV: {application.cv.title} · added{" "}
                    {formatDate(application.createdAt)}
                  </p>
                </div>

                <Link
                  href={`/applications/${application.id}`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  View
                  <ArrowRight aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
