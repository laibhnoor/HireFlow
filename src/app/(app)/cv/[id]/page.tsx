import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, Download, FileText, Star } from "lucide-react";

import { setPrimaryCvAction } from "@/app/(app)/cv/actions";
import { auth } from "@/auth";
import { CvStatusBadge } from "@/components/cv/cv-status-badge";
import { DeleteCvButton } from "@/components/cv/delete-cv-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "CV" };

  const { id } = await params;
  const cv = await prisma.cv.findFirst({
    where: { id, userId: session.user.id },
    select: { title: true },
  });

  return { title: cv?.title ?? "CV" };
}

export default async function CvDetailPage({ params }: Params) {
  const user = await requireUser();
  const { id } = await params;

  const cv = await prisma.cv.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileSize: true,
      isPrimary: true,
      parseStatus: true,
      parseError: true,
      createdAt: true,
      textContent: true,
      parsedJson: true,
      chunks: {
        orderBy: { ordinal: "asc" },
        select: {
          id: true,
          ordinal: true,
          section: true,
          content: true,
          tokenCount: true,
        },
      },
    },
  });

  if (!cv) notFound();

  const parsed = readParsed(cv.parsedJson);
  const sections = parsed?.sections ?? [];

  return (
    <>
      <div className="mb-6">
        <Link
          href="/cv"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          CV library
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {cv.title}
              </h1>
              {cv.isPrimary ? (
                <Badge className="gap-1">
                  <Star className="size-3 fill-current" aria-hidden />
                  Primary
                </Badge>
              ) : null}
              <CvStatusBadge status={cv.parseStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {cv.fileName} · {formatBytes(cv.fileSize)} · uploaded{" "}
              {formatDate(cv.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={`/api/cv/${cv.id}/file`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download aria-hidden />
              Download
            </a>
            {!cv.isPrimary && cv.parseStatus === "READY" ? (
              <form action={setPrimaryCvAction}>
                <input type="hidden" name="cvId" value={cv.id} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <Star aria-hidden />
                  Make primary
                </Button>
              </form>
            ) : null}
            <DeleteCvButton cvId={cv.id} fromDetail />
          </div>
        </div>
      </div>

      {cv.parseStatus === "FAILED" ? (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">
              This CV could not be processed
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cv.parseError ??
                "We couldn't extract readable text from this file."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words" value={parsed?.wordCount ?? 0} />
        <Stat label="Sections" value={sections.length} />
        <Stat label="Passages" value={cv.chunks.length} />
        <Stat label="Extractor" value={parsed?.extractor?.toUpperCase() ?? "—"} />
      </div>

      <div className="mt-6 space-y-5">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Parsed sections</h2>

          {sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <Card key={`${section.name}-${index}`}>
                  <CardHeader className="px-4 py-3">
                    <CardTitle className="text-sm">{section.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <FileText className="size-4 shrink-0" aria-hidden />
                No sections were detected. The extracted text is shown below.
              </CardContent>
            </Card>
          )}
        </section>

        {cv.chunks.length > 0 ? (
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
              Indexed passages ({cv.chunks.length})
            </summary>
            <div className="space-y-2 border-t p-4">
              {cv.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-lg border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    <span>{chunk.section}</span>
                    <span>
                      #{chunk.ordinal + 1} · ~{chunk.tokenCount} tokens
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {cv.textContent ? (
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
              Extracted text
            </summary>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t p-4 text-xs leading-relaxed text-muted-foreground">
              {cv.textContent}
            </pre>
          </details>
        ) : null}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function readParsed(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as {
    sections?: unknown;
    wordCount?: unknown;
    extractor?: unknown;
  };

  if (!Array.isArray(record.sections)) return null;

  const sections = record.sections
    .map((section) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return null;
      }
      const item = section as { name?: unknown; content?: unknown };
      if (typeof item.name !== "string" || typeof item.content !== "string") {
        return null;
      }
      return { name: item.name, content: item.content };
    })
    .filter((section): section is { name: string; content: string } =>
      Boolean(section),
    );

  return {
    sections,
    wordCount: typeof record.wordCount === "number" ? record.wordCount : 0,
    extractor: typeof record.extractor === "string" ? record.extractor : null,
  };
}
