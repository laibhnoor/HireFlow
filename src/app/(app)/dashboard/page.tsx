import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  FileText,
  Gauge,
  Percent,
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
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatusValue,
} from "@/lib/applications/status";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { computeTrackerMetrics, eventLabel } from "@/lib/tracker";
import { cn, formatDate } from "@/lib/utils";

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
    href: "/applications?view=board",
    icon: CalendarCheck,
    title: "Prepare and track",
    body: "Generate materials, rehearse interviews, and move the application forward.",
  },
];

const STATUS_DOTS: Record<ApplicationStatusValue, string> = {
  SAVED: "bg-border",
  APPLIED: "bg-primary/45",
  SCREENING: "bg-warning",
  INTERVIEW: "bg-primary",
  OFFER: "bg-success",
  REJECTED: "bg-destructive/50",
  WITHDRAWN: "bg-muted-foreground/40",
};

const STATUS_BARS: Record<ApplicationStatusValue, string> = {
  SAVED: "bg-border",
  APPLIED: "bg-primary/45",
  SCREENING: "bg-warning",
  INTERVIEW: "bg-primary",
  OFFER: "bg-success",
  REJECTED: "bg-destructive/50",
  WITHDRAWN: "bg-muted-foreground/40",
};

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  const [readyCvs, applications, recentEvents] = await Promise.all([
    prisma.cv.count({ where: { userId: user.id, parseStatus: "READY" } }),
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        appliedAt: true,
        job: { select: { company: true, title: true } },
        analysis: { select: { overallScore: true } },
      },
    }),
    prisma.applicationEvent.findMany({
      where: { application: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        type: true,
        note: true,
        createdAt: true,
        application: {
          select: {
            id: true,
            job: { select: { title: true, company: true } },
          },
        },
      },
    }),
  ]);

  const metrics = computeTrackerMetrics(applications);
  const recent = applications.slice(0, 4);
  const statusCounts = APPLICATION_STATUSES.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status)
      .length,
  }));

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Avg match"
          value={metrics.averageScore ?? "—"}
          hint={
            metrics.averageScore === null
              ? "Analyse a job to calculate"
              : `Across ${applications.filter((application) => application.analysis).length} scored`
          }
          icon={Target}
        />
        <StatCard
          label="Active"
          value={metrics.active}
          hint={
            applications.length === 0
              ? "Nothing in progress"
              : `${metrics.total} total`
          }
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Interviews"
          value={metrics.interviews}
          hint={metrics.interviews === 0 ? "None scheduled" : "In progress"}
          icon={CalendarCheck}
        />
        <StatCard
          label="Offers"
          value={metrics.offers}
          hint={metrics.offers === 0 ? "Keep going" : "Congratulations"}
          icon={Trophy}
        />
        <StatCard
          label="Response rate"
          value={
            metrics.responseRate === null ? "—" : `${metrics.responseRate}%`
          }
          hint={
            metrics.submitted === 0
              ? "Apply to start measuring"
              : `${metrics.responded} of ${metrics.submitted} submitted`
          }
          icon={Percent}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {applications.length === 0 ? (
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
        ) : (
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle>Pipeline</CardTitle>
                <CardDescription>
                  {metrics.active} active · {metrics.closed} closed
                </CardDescription>
              </div>
              <Link
                href="/applications?view=board"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Gauge aria-hidden />
                Board
              </Link>
            </CardHeader>
            <CardContent>
              <div
                className="flex h-2 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label="Application status breakdown"
              >
                {statusCounts
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span
                      key={item.status}
                      className={STATUS_BARS[item.status]}
                      style={{
                        width: `${(item.count / metrics.total) * 100}%`,
                      }}
                    />
                  ))}
              </div>

              <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {statusCounts.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        STATUS_DOTS[item.status],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className="font-medium tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
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
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })}
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

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link
              href="/applications?view=timeline"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Timeline
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <Card>
              <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                <Activity
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                Activity appears here as you analyse jobs, generate materials and
                move applications forward.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/applications/${event.application.id}`}
                    className="block px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{eventLabel(event.type)}</Badge>
                      <time className="text-[11px] text-muted-foreground">
                        {formatDate(event.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 truncate text-sm">
                      {event.note ??
                        `${event.application.job.title} · ${event.application.job.company}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.application.job.title} ·{" "}
                      {event.application.job.company}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
