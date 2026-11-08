import { Prisma } from "@prisma/client";

import { embedTexts, toVectorLiteral } from "@/lib/ai/embeddings";
import { chunkSections } from "@/lib/cv/chunk";
import { extractCvText } from "@/lib/cv/extract";
import { parseCvSections } from "@/lib/cv/sections";
import { CvUploadError, type ParsedCv } from "@/lib/cv/types";
import {
  assertFileSize,
  CANONICAL_MIME,
  deriveTitle,
  detectCvKind,
  sanitizeFileName,
} from "@/lib/cv/validate";
import { prisma } from "@/lib/db";

const MAX_CVS_PER_USER = 25;

export type IngestResult = {
  cvId: string;
  sectionCount: number;
  chunkCount: number;
  mockedEmbeddings: boolean;
};

export async function ingestCv(
  userId: string,
  file: File,
): Promise<IngestResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertFileSize(bytes);

  const kind = detectCvKind(file.name, bytes);
  const mimeType = CANONICAL_MIME[kind];

  const existing = await prisma.cv.count({ where: { userId } });
  if (existing >= MAX_CVS_PER_USER) {
    throw new CvUploadError(
      400,
      `You've reached the ${MAX_CVS_PER_USER} CV limit. Delete an older CV first.`,
    );
  }

  const cv = await prisma.cv.create({
    data: {
      userId,
      title: deriveTitle(file.name || "cv"),
      fileName: sanitizeFileName(file.name || "cv"),
      mimeType,
      fileSize: bytes.byteLength,
      fileBytes: Buffer.from(bytes),
      textContent: "",
      parseStatus: "PROCESSING",
      isPrimary: existing === 0,
    },
    select: { id: true },
  });

  try {
    const text = await extractCvText(kind, bytes);

    if (text.trim().length < 40) {
      throw new CvUploadError(
        422,
        "We couldn't find enough readable text in that CV. If it's a scanned document, upload a text-based PDF or DOCX.",
      );
    }

    const sections = parseCvSections(text);
    const drafts = chunkSections(sections);

    if (drafts.length === 0) {
      throw new CvUploadError(
        422,
        "That CV doesn't contain enough structured content to analyse.",
      );
    }

    let embeddings;
    try {
      embeddings = await embedTexts(drafts.map((draft) => draft.content));
    } catch (error) {
      console.error("[cv] embedding failed", error);
      throw new CvUploadError(
        502,
        "We couldn't index this CV with the configured AI provider. Check your OpenAI settings or try again.",
      );
    }

    if (embeddings.vectors.length !== drafts.length) {
      throw new CvUploadError(502, "The embedding provider returned an unexpected result. Try again.");
    }

    const chunks = await prisma.$transaction(
      drafts.map((draft) =>
        prisma.cvChunk.create({
          data: {
            cvId: cv.id,
            ordinal: draft.ordinal,
            section: draft.section,
            content: draft.content,
            tokenCount: draft.tokenCount,
          },
          select: { id: true },
        }),
      ),
    );

    for (let index = 0; index < chunks.length; index += 1) {
      await prisma.$executeRaw`
        UPDATE "CvChunk"
        SET embedding = ${toVectorLiteral(embeddings.vectors[index])}::vector
        WHERE id = ${chunks[index].id}
      `;
    }

    const parsed: ParsedCv = {
      sections,
      wordCount: countWords(text),
      charCount: text.length,
      extractor: kind,
    };

    await prisma.cv.update({
      where: { id: cv.id },
      data: {
        textContent: text,
        parsedJson: parsed as unknown as Prisma.InputJsonValue,
        parseStatus: "READY",
        parseError: null,
      },
    });

    await prisma.usageLog.create({
      data: {
        userId,
        kind: "embedding",
        model: embeddings.model,
        inputTokens: embeddings.inputTokens,
      },
    });

    return {
      cvId: cv.id,
      sectionCount: sections.length,
      chunkCount: drafts.length,
      mockedEmbeddings: embeddings.mocked,
    };
  } catch (error) {
    await prisma.cv.deleteMany({ where: { id: cv.id } }).catch((cleanup) => {
      console.error("[cv] failed to clean up after ingest error", cleanup);
    });
    throw error;
  }
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
