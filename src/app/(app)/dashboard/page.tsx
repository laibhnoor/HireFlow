import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  FileText,
  Target,
  Trophy,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";

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
    href: "/applications",
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

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Here's where your search stands today."
        actions={
          <Link
            href="/cv"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <FileText className="size-4" aria-hidden />
            Add your CV
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Readiness"
          value="—"
          hint="Add a CV to calculate"
          icon={Target}
        />
        <StatCard
          label="Active applications"
          value={0}
          hint="Nothing in progress"
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Interviews"
          value={0}
          hint="None scheduled"
          icon={CalendarCheck}
        />
        <StatCard
          label="Offers"
          value={0}
          hint="Keep going"
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
          <Badge variant="secondary">0 total</Badge>
        </div>
        <EmptyState
          icon={BriefcaseBusiness}
          title="No applications yet"
          description="Once you analyse a job, it will appear here with its match score and next step."
          action={
            <Link
              href="/applications"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-accent"
            >
              Go to applications
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
      </div>
    </>
  );
}
