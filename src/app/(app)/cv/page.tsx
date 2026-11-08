import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download, FileText, Star } from "lucide-react";

import { setPrimaryCvAction } from "@/app/(app)/cv/actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { CvUploader } from "@/components/cv/cv-uploader";
import { CvStatusBadge } from "@/components/cv/cv-status-badge";
import { DeleteCvButton } from "@/components/cv/delete-cv-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CV library",
};

type CvRow = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  isPrimary: boolean;
  parseStatus: string;
  parseError: string | null;
  createdAt: Date;
  parsedJson: Prisma.JsonValue;
  _count: { chunks: number };
};

export default async function CvPage() {
  const user = await requireUser();

  const cvs = await prisma.cv.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      fileName: true,
      fileSize: true,
      isPrimary: true,
      parseStatus: true,
      parseError: true,
      createdAt: true,
      parsedJson: true,
      _count: { select: { chunks: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="CV library"
        description="The source of truth for every analysis. Upload once, reuse across applications."
        actions={
          <Badge variant="secondary">
            {cvs.length} CV{cvs.length === 1 ? "" : "s"}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          {cvs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No CVs yet"
              description="Add your first CV using the panel on the right. It will be parsed into sections and indexed for evidence-based matching."
            />
          ) : (
            cvs.map((cv) => <CvCard key={cv.id} cv={cv} />)
          )}
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <CvUploader mockMode={env.llmMockMode} />
        </div>
      </div>
    </>
  );
}

function CvCard({ cv }: { cv: CvRow }) {
  const stats = readStats(cv.parsedJson);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/cv/${cv.id}`}
                className="truncate text-sm font-semibold underline-offset-4 hover:underline"
              >
                {cv.title}
              </Link>
              {cv.isPrimary ? (
                <Badge className="gap-1">
                  <Star className="size-3 fill-current" aria-hidden />
                  Primary
                </Badge>
              ) : null}
              <CvStatusBadge status={cv.parseStatus} />
            </div>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {cv.fileName} · {formatBytes(cv.fileSize)} ·{" "}
              {formatDate(cv.createdAt)}
            </p>

            {cv.parseStatus === "READY" && stats ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.sections} section{stats.sections === 1 ? "" : "s"} ·{" "}
                {cv._count.chunks} indexed passage
                {cv._count.chunks === 1 ? "" : "s"} · {stats.words} words
              </p>
            ) : null}

            {cv.parseStatus === "FAILED" && cv.parseError ? (
              <p className="mt-1 text-xs text-destructive">{cv.parseError}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3">
          <Link
            href={`/cv/${cv.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View
          </Link>
          <a
            href={`/api/cv/${cv.id}/file`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Download aria-hidden />
            Download
          </a>
          {!cv.isPrimary && cv.parseStatus === "READY" ? (
            <form action={setPrimaryCvAction}>
              <input type="hidden" name="cvId" value={cv.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <Star aria-hidden />
                Make primary
              </Button>
            </form>
          ) : null}
          <DeleteCvButton cvId={cv.id} className="ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

function readStats(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { sections?: unknown; wordCount?: unknown };
  return {
    sections: Array.isArray(record.sections) ? record.sections.length : 0,
    words: typeof record.wordCount === "number" ? record.wordCount : 0,
  };
}
