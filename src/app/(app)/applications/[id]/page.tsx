import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Map,
  MessagesSquare,
  PenLine,
  Quote,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";

import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import type { MaterialDocView } from "@/components/applications/material-generator";
import { MaterialGenerator } from "@/components/applications/material-generator";
import { ScoreRing } from "@/components/score-ring";
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
import type { MaterialType } from "@/lib/generation/types";
import {
  IMPORTANCE_LABELS,
  REQUIREMENT_TYPE_LABELS,
  VERDICT_LABELS,
  type ImportanceValue,
  type RequirementTypeValue,
  type VerdictValue,
} from "@/lib/jobs/types";
import { cn, formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };
type PageProps = Params & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type TabKey =
  | "overview"
  | "cover-letter"
  | "suggestions"
  | "roadmap"
  | "interview";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Target }> = [
  { key: "overview", label: "Analysis", icon: Target },
  { key: "cover-letter", label: "Cover letter", icon: PenLine },
  { key: "suggestions", label: "CV suggestions", icon: Sparkles },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "interview", label: "Interview prep", icon: MessagesSquare },
];

function parseTab(value: string | string[] | undefined): TabKey {
  switch (value) {
    case "cover-letter":
    case "suggestions":
    case "roadmap":
    case "interview":
      return value;
    default:
      return "overview";
  }
}

function toMaterialDocView(
  document: {
    id: string;
    type: string;
    title: string;
    content: string;
    version: number;
    model: string;
    promptVersion: string;
    createdAt: Date;
  },
  type: MaterialType,
): MaterialDocView {
  return {
    id: document.id,
    type,
    title: document.title,
    content: document.content,
    version: document.version,
    model: document.model,
    promptVersion: document.promptVersion,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await requireUser();
  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, userId: user.id },
    select: { job: { select: { title: true, company: true } } },
  });

  if (!application) return { title: "Application" };

  return {
    title: `${application.job.title} · ${application.job.company}`,
  };
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const search = await searchParams;
  const currentTab: TabKey = parseTab(search.tab);

  const application = await prisma.application.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      cv: { select: { id: true, title: true } },
      job: {
        select: {
          company: true,
          title: true,
          location: true,
          employmentType: true,
          url: true,
          description: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          version: true,
          model: true,
          promptVersion: true,
          createdAt: true,
        },
      },
      analysis: {
        select: {
          overallScore: true,
          dimensionScores: true,
          matchedSkills: true,
          missingSkills: true,
          summary: true,
          rubricVersion: true,
          promptVersion: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
          matches: {
            orderBy: { ordinal: "asc" },
            select: {
              id: true,
              ordinal: true,
              requirementText: true,
              requirementType: true,
              importance: true,
              verdict: true,
              weight: true,
              rationale: true,
              evidence: true,
            },
          },
        },
      },
    },
  });

  if (!application) notFound();

  const { job, cv, analysis, documents } = application;

  const coverLetterDocs: MaterialDocView[] = documents
    .filter((document) => document.type === "COVER_LETTER")
    .map((document) => toMaterialDocView(document, "COVER_LETTER"));
  const suggestionDocs: MaterialDocView[] = documents
    .filter((document) => document.type === "CV_SUGGESTIONS")
    .map((document) => toMaterialDocView(document, "CV_SUGGESTIONS"));
  const roadmapDocs: MaterialDocView[] = documents
    .filter((document) => document.type === "ROADMAP")
    .map((document) => toMaterialDocView(document, "ROADMAP"));
  const interviewDocs: MaterialDocView[] = documents
    .filter((document) => document.type === "INTERVIEW_PREP")
    .map((document) => toMaterialDocView(document, "INTERVIEW_PREP"));

  return (
    <>
      <Link
        href="/applications"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Applications
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {job.title}
            </h1>
            <ApplicationStatusSelect
              applicationId={application.id}
              status={application.status}
              compact
              className="w-36"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
            {job.employmentType ? ` · ${job.employmentType}` : ""}
          </p>
          {analysis ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Analysed {formatDate(analysis.createdAt)} against {cv.title}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/cv/${cv.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileText aria-hidden />
            View CV
          </Link>
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink aria-hidden />
              Original job
            </a>
          ) : null}
        </div>
      </div>

      {!analysis ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            This application has no analysis yet.{" "}
            <Link
              href="/applications/new"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Analyse a job description
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <>
          <nav
            aria-label="Application sections"
            className="mb-5 flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.key;
              const count =
                tab.key === "cover-letter"
                  ? coverLetterDocs.length
                  : tab.key === "suggestions"
                    ? suggestionDocs.length
                    : tab.key === "roadmap"
                      ? roadmapDocs.length
                      : tab.key === "interview"
                        ? interviewDocs.length
                        : 0;

              return (
                <Link
                  key={tab.key}
                  href={`/applications/${application.id}?tab=${tab.key}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {tab.label}
                  {count > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {currentTab === "overview" ? (
            <AnalysisBody
              analysis={analysis}
              matches={analysis.matches}
              jobDescription={job.description}
            />
          ) : currentTab === "cover-letter" ? (
            <MaterialGenerator
              applicationId={application.id}
              materialType="COVER_LETTER"
              docs={coverLetterDocs}
              mockMode={env.llmMockMode}
            />
          ) : currentTab === "suggestions" ? (
            <MaterialGenerator
              applicationId={application.id}
              materialType="CV_SUGGESTIONS"
              docs={suggestionDocs}
              mockMode={env.llmMockMode}
            />
          ) : currentTab === "roadmap" ? (
            <MaterialGenerator
              applicationId={application.id}
              materialType="ROADMAP"
              docs={roadmapDocs}
              mockMode={env.llmMockMode}
            />
          ) : (
            <MaterialGenerator
              applicationId={application.id}
              materialType="INTERVIEW_PREP"
              docs={interviewDocs}
              mockMode={env.llmMockMode}
            />
          )}
        </>
      )}
    </>
  );
}

type MatchRow = {
  id: string;
  ordinal: number;
  requirementText: string;
  requirementType: string;
  importance: string;
  verdict: string;
  weight: number;
  rationale: string | null;
  evidence: Prisma.JsonValue;
};

type AnalysisRow = {
  overallScore: number;
  dimensionScores: Prisma.JsonValue;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  rubricVersion: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
  matches: MatchRow[];
};

function AnalysisBody({
  analysis,
  matches,
  jobDescription,
}: {
  analysis: AnalysisRow;
  matches: MatchRow[];
  jobDescription: string;
}) {
  const dimensions = readDimensions(analysis.dimensionScores);
  const mustHave = matches.filter((match) => match.importance === "MUST_HAVE");
  const niceToHave = matches.filter(
    (match) => match.importance === "NICE_TO_HAVE",
  );

  const counts = {
    matched: matches.filter((match) => match.verdict === "MATCHED").length,
    partial: matches.filter((match) => match.verdict === "PARTIAL").length,
    missing: matches.filter((match) => match.verdict === "MISSING").length,
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={analysis.overallScore} size={148} label="Match" />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <ScoreBand score={analysis.overallScore} />
                <Badge variant="outline">{matches.length} requirements</Badge>
                <Badge variant="secondary">
                  <CheckCircle2 aria-hidden />
                  {counts.matched} matched
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Rubric v{analysis.rubricVersion} · {analysis.model} ·{" "}
                {analysis.inputTokens + analysis.outputTokens} tokens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Matched" value={counts.matched} tone="success" />
        <MiniStat label="Partial" value={counts.partial} tone="warning" />
        <MiniStat label="Missing" value={counts.missing} tone="destructive" />
        <MiniStat label="Evidence passages" value={evidenceCount(matches)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Rubric breakdown</CardTitle>
          <CardDescription>
            Weighted from {matches.length} requirement verdicts. Dimensions with
            no matching requirements release their weight to the others.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dimensions.length > 0 ? (
            dimensions.map((dimension) => (
              <div key={dimension.key || dimension.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium">{dimension.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {dimension.score}% · {dimension.weight} pts
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      dimension.score >= 75
                        ? "bg-success"
                        : dimension.score >= 50
                          ? "bg-warning"
                          : "bg-destructive",
                    )}
                    style={{
                      width: `${dimension.applicable ? dimension.score : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {dimension.applicable
                    ? dimension.detail
                    : "Not applicable — weight redistributed."}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              This analysis did not store a rubric breakdown.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="size-4 text-success" aria-hidden />
              Matched evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.matchedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {analysis.matchedSkills.map((skill) => (
                  <Badge key={skill} variant="success">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No requirements were fully matched.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <TriangleAlert className="size-4 text-destructive" aria-hidden />
              Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingSkills.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No requirements are completely missing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <RequirementSection
        title="Must-have requirements"
        description="Non-negotiable requirements extracted from the description."
        matches={mustHave}
      />

      <RequirementSection
        title="Nice-to-have requirements"
        description="Preferred skills that strengthen the application."
        matches={niceToHave}
      />

      <details className="rounded-xl border bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
          Job description
        </summary>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t p-4 text-xs leading-relaxed text-muted-foreground">
          {jobDescription}
        </pre>
      </details>

      <p className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Scores are computed in application code from rubric v
        {analysis.rubricVersion}. The model only extracts requirements and
        classifies them against retrieved CV passages; it never writes the
        score, and verdicts without a real citation are treated as missing.
      </p>
    </div>
  );
}

function RequirementSection({
  title,
  description,
  matches,
}: {
  title: string;
  description: string;
  matches: MatchRow[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary">{matches.length}</Badge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
          None were identified in this description.
        </p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <RequirementCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}

function RequirementCard({ match }: { match: MatchRow }) {
  const evidence = readEvidence(match.evidence);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={verdictVariant(match.verdict)}>
            {VERDICT_LABELS[match.verdict as VerdictValue]}
          </Badge>
          <Badge variant="outline">
            {REQUIREMENT_TYPE_LABELS[match.requirementType as RequirementTypeValue]}
          </Badge>
          <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            {IMPORTANCE_LABELS[match.importance as ImportanceValue]} · weight{" "}
            {match.weight}
          </span>
        </div>

        <p className="mt-2 text-sm font-medium leading-relaxed">
          {match.requirementText}
        </p>

        {match.rationale ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {match.rationale}
          </p>
        ) : null}

        {evidence.length > 0 ? (
          <div className="mt-3 space-y-2 border-l-2 border-primary/20 pl-3">
            {evidence.map((item) => (
              <div key={`${match.id}-${item.chunkId}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{item.section}</Badge>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    retrieval {Math.round(item.similarity * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs italic leading-relaxed text-muted-foreground">
                  &ldquo;{item.snippet}&rdquo;
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-lg font-semibold tabular-nums",
            tone === "success"
              ? "text-success"
              : tone === "warning"
                ? "text-warning-foreground dark:text-warning"
                : tone === "destructive"
                  ? "text-destructive"
                  : undefined,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ScoreBand({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="success">Strong match</Badge>;
  if (score >= 60) return <Badge variant="warning">Credible match</Badge>;
  if (score >= 40) return <Badge variant="warning">Partial match</Badge>;
  return <Badge variant="destructive">Weak match</Badge>;
}

function verdictVariant(verdict: string) {
  if (verdict === "MATCHED") return "success" as const;
  if (verdict === "PARTIAL") return "warning" as const;
  return "destructive" as const;
}

function evidenceCount(matches: MatchRow[]) {
  return matches.reduce(
    (total, match) => total + readEvidence(match.evidence).length,
    0,
  );
}

function readDimensions(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;

    if (
      typeof record.label !== "string" ||
      typeof record.score !== "number" ||
      typeof record.weight !== "number"
    ) {
      return [];
    }

    return [
      {
        key: typeof record.key === "string" ? record.key : "",
        label: record.label,
        weight: record.weight,
        score: Math.max(0, Math.min(100, Math.round(record.score))),
        detail: typeof record.detail === "string" ? record.detail : "",
        applicable: record.applicable !== false,
      },
    ];
  });
}

function readEvidence(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;

    if (
      typeof record.chunkId !== "string" ||
      typeof record.snippet !== "string"
    ) {
      return [];
    }

    return [
      {
        chunkId: record.chunkId,
        section: typeof record.section === "string" ? record.section : "CV",
        snippet: record.snippet,
        similarity:
          typeof record.similarity === "number"
            ? Math.max(0, Math.min(1, record.similarity))
            : 0,
      },
    ];
  });
}
