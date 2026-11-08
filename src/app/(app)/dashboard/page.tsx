import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  FileText,
  Plus,
  Target,
  Trophy,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ScoreChip } from "@/components/applications/score-chip";
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
import { formatDate } from "@/lib/utils";

const rubric = [
  { label: "Must-have skills", weight: 40 },
  { label: "Relevant experience", weight: 25 },
  { label: "Education & certifications", weight: 15 },
  { label: "Projects & portfolio", weight: 10 },
  { label: "Seniority & ATS keywords", weight: 10 },
];

const steps = [
  {
    href: "/cv",
    icon: FileText,
    title: "Upload your CV",
    body: "Index your experience, projects and education so every claim can be cited.",
  },
  {
    href: "/applications/new",
    icon: Target,
    title: "Analyse a job",
    body: "Paste a description and get a requirement-level match breakdown.",
  },
  {
    href: "/applications",
    icon: CalendarCheck,
    title: "Prepare and track",
    body: "Generate materials, rehearse interviews, and move the application forward.",
  },
];

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  const [readyCvs, applications] = await Promise.all([
    prisma.cv.count({ where: { userId: user.id, parseStatus: "READY" } }),
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: { select: { company: true, title: true } },
        analysis: { select: { overallScore: true } },
      },
    }),
  ]);

  const scored = applications.filter(
    (application) => application.analysis !== null,
  );
  const readiness =
    scored.length === 0
      ? "—"
      : Math.round(
          scored.reduce(
            (total, application) =>
              total + (application.analysis?.overallScore ?? 0),
            0,
          ) / scored.length,
        );

  const active = applications.filter(
    (application) =>
      application.status !== "REJECTED" &&
      application.status !== "WITHDRAWN",
  ).length;
  const interviews = applications.filter(
    (application) => application.status === "INTERVIEW",
  ).length;
  const offers = applications.filter(
    (application) => application.status === "OFFER",
  ).length;
  const recent = applications.slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Here's where your search stands today."
        actions={
          <Link
            href={readyCvs === 0 ? "/cv" : "/applications/new"}
            className={buttonVariants()}
          >
            {readyCvs === 0 ? (
              <FileText aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
            {readyCvs === 0 ? "Add your CV" : "Analyse a job"}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Readiness"
          value={readiness}
          hint={
            scored.length === 0
              ? "Analyse a job to calculate"
              : `Across ${scored.length} application${scored.length === 1 ? "" : "s"}`
          }
          icon={Target}
        />
        <StatCard
          label="Active applications"
          value={active}
          hint={
            applications.length === 0
              ? "Nothing in progress"
              : `${applications.length} total`
          }
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Interviews"
          value={interviews}
          hint={interviews === 0 ? "None scheduled" : "In progress"}
          icon={CalendarCheck}
        />
        <StatCard
          label="Offers"
          value={offers}
          hint={offers === 0 ? "Keep going" : "Congratulations"}
          icon={Trophy}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Three steps from an empty workspace to a tailored application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className="group flex items-start gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <step.icon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-sm font-medium">{step.title}</span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {step.body}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Score rubric</CardTitle>
            <CardDescription>
              Transparent weights, applied to every application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rubric.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium tabular-nums">{item.weight}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${item.weight}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
              Rubric v1.0 · stored with every analysis so past scores stay
              explainable.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent applications</h2>
          <Badge variant="secondary">{applications.length} total</Badge>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No applications yet"
            description={
              readyCvs === 0
                ? "Upload your CV first, then analyse a job description to get your first match score."
                : "Analyse a job description and it will appear here with its match score and cited evidence."
            }
            action={
              <Link
                href={readyCvs === 0 ? "/cv" : "/applications/new"}
                className={buttonVariants({ variant: "outline" })}
              >
                {readyCvs === 0 ? "Add your CV" : "Analyse a job"}
                <ArrowRight aria-hidden />
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {recent.map((application) => (
              <Card key={application.id}>
                <CardContent className="flex items-center gap-3 p-3.5">
                  <ScoreChip score={application.analysis?.overallScore} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/applications/${application.id}`}
                        className="truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {application.job.title}
                      </Link>
                      <ApplicationStatusBadge status={application.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {application.job.company} ·{" "}
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
      </div>
    </>
  );
}
