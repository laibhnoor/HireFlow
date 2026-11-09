import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  BriefcaseBusiness,
  Columns3,
  History,
  List,
  MapPin,
  Plus,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { ScoreChip } from "@/components/applications/score-chip";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  isClosedStatus,
} from "@/lib/applications/status";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import {
  eventLabel,
  groupApplicationsByStatus,
  groupEventsByDay,
} from "@/lib/tracker";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Applications",
};

type View = "list" | "board" | "timeline";
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const VIEWS: Array<{ key: View; label: string; icon: typeof List }> = [
  { key: "list", label: "List", icon: List },
  { key: "board", label: "Board", icon: Columns3 },
  { key: "timeline", label: "Timeline", icon: History },
];

function parseView(value: string | string[] | undefined): View {
  return value === "board" || value === "timeline" ? value : "list";
}

export default async function ApplicationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const search = await searchParams;
  const view = parseView(search.view);

  const [applications, events] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        appliedAt: true,
        job: { select: { company: true, title: true, location: true } },
        cv: { select: { title: true } },
        analysis: { select: { overallScore: true } },
      },
    }),
    view === "timeline"
      ? prisma.applicationEvent.findMany({
          where: { application: { userId: user.id } },
          orderBy: { createdAt: "desc" },
          take: 120,
          select: {
            id: true,
            type: true,
            note: true,
            createdAt: true,
            applicationId: true,
            application: {
              select: { job: { select: { title: true, company: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const groups = groupApplicationsByStatus(applications);
  const timeline = groupEventsByDay(events);

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every role you're pursuing, with its evidence-backed match score."
        actions={
          <>
            <Badge variant="secondary">{applications.length} total</Badge>
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
        <>
          <nav
            aria-label="Application views"
            className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm"
          >
            {VIEWS.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <Link
                  key={item.key}
                  href={`/applications?view=${item.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {view === "list" ? (
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
                            <MapPin
                              className="inline size-3 -translate-y-px"
                              aria-hidden
                            />{" "}
                            {application.job.location}
                          </>
                        ) : null}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        CV: {application.cv.title} · updated{" "}
                        {formatDate(application.updatedAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      <ApplicationStatusSelect
                        applicationId={application.id}
                        status={application.status}
                        compact
                        className="w-32"
                      />
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {view === "board" ? (
            <div className="-mx-1 overflow-x-auto pb-3">
              <div className="flex min-w-max gap-3 px-1">
                {BOARD_COLUMNS.map((column) => {
                  const items = groups[column];
                  return (
                    <section
                      key={column}
                      className="w-64 shrink-0"
                      aria-label={BOARD_COLUMN_LABELS[column]}
                    >
                      <header className="mb-2 flex items-center justify-between px-1">
                        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {BOARD_COLUMN_LABELS[column]}
                        </h2>
                        <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                          {items.length}
                        </span>
                      </header>

                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
                            Nothing here
                          </p>
                        ) : (
                          items.map((application) => (
                            <article
                              key={application.id}
                              className="rounded-xl border bg-card p-3 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  href={`/applications/${application.id}`}
                                  className="line-clamp-2 text-sm font-medium underline-offset-4 hover:underline"
                                >
                                  {application.job.title}
                                </Link>
                                <ScoreChip
                                  score={application.analysis?.overallScore}
                                  className="size-9 text-xs"
                                />
                              </div>

                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {application.job.company}
                                {application.job.location
                                  ? ` · ${application.job.location}`
                                  : ""}
                              </p>

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {isClosedStatus(application.status)
                                  ? "Closed"
                                  : "Updated"}{" "}
                                {formatDate(application.updatedAt)}
                              </p>

                              <ApplicationStatusSelect
                                applicationId={application.id}
                                status={application.status}
                                compact
                                className="mt-2"
                              />
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === "timeline" ? (
            timeline.length === 0 ? (
              <EmptyState
                icon={History}
                title="No activity yet"
                description="Status changes, analyses and generated materials will appear here as you work through your applications."
                action={
                  <Link
                    href="/applications?view=board"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <ArrowDownUp aria-hidden />
                    Open the board
                  </Link>
                }
              />
            ) : (
              <div className="space-y-6">
                {timeline.map((day) => (
                  <section key={day.date}>
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {formatDate(`${day.date}T12:00:00Z`)}
                    </h2>
                    <div className="mt-2 space-y-2 border-l border-border pl-4">
                      {day.events.map((event) => (
                        <article key={event.id} className="relative">
                          <span
                            className="absolute top-3 -left-[21px] size-2 rounded-full bg-border ring-4 ring-background"
                            aria-hidden
                          />
                          <div className="rounded-lg border bg-card p-3 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {eventLabel(event.type)}
                              </Badge>
                              <time className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                                {formatTime(event.createdAt)}
                              </time>
                            </div>
                            {event.note ? (
                              <p className="mt-1 text-sm">{event.note}</p>
                            ) : null}
                            <Link
                              href={`/applications/${event.applicationId}`}
                              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                              {event.application.job.title} ·{" "}
                              {event.application.job.company}
                              <ArrowRight className="size-3" aria-hidden />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : null}
        </>
      )}
    </>
  );
}

function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
