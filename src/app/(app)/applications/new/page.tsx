import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ListChecks,
  Lock,
  Quote,
  Target,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { JobAnalyzerForm } from "@/components/applications/job-analyzer-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Analyse a job",
};

export default async function NewApplicationPage() {
  const user = await requireUser();

  const cvs = await prisma.cv.findMany({
    where: { userId: user.id, parseStatus: "READY" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, isPrimary: true },
  });

  return (
    <>
      <Link
        href="/applications"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Applications
      </Link>

      <PageHeader
        title="Analyse a job description"
        description="Paste the role, choose a CV, and get a requirement-level match with cited evidence."
      />

      {cvs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Upload a CV first"
          description="Scoring needs indexed CV passages to compare against the job. Add a PDF, DOCX or TXT and come back."
          action={
            <Link href="/cv" className={buttonVariants()}>
              <FileText aria-hidden />
              Go to CV library
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Job details</CardTitle>
              <CardDescription>
                We extract must-have and nice-to-have requirements, then test
                each one against your CV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobAnalyzerForm
                cvs={cvs}
                defaultCvId={cvs.find((cv) => cv.isPrimary)?.id ?? cvs[0]?.id}
              />
            </CardContent>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">What you&apos;ll get</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  {
                    icon: Target,
                    title: "Rubric score",
                    body: "Weighted across must-have skills, experience, education, projects and keywords.",
                  },
                  {
                    icon: ListChecks,
                    title: "Requirement verdicts",
                    body: "Every requirement is marked matched, partial or missing.",
                  },
                  {
                    icon: Quote,
                    title: "Cited evidence",
                    body: "Matched and partial verdicts quote the exact CV passage that supports them.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <item.icon className="size-3.5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Lock className="size-3.5" aria-hidden />
                Evidence only
              </p>
              <p className="mt-1.5">
                The model never invents experience. If it cites a passage that
                doesn&apos;t exist, that verdict is dropped and treated as
                missing.
              </p>
              {env.llmMockMode ? (
                <p className="mt-2 border-t border-border/60 pt-2">
                  Demo mode: requirements and verdicts use the local
                  deterministic pipeline. Add an OpenAI key for model-quality
                  extraction.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">Rubric v1.0</Badge>
              <Badge variant="outline">pgvector retrieval</Badge>
              <Badge variant="outline">Cited evidence</Badge>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
