import { Prisma } from "@prisma/client";

import { embedTexts } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { classifyRequirements } from "@/lib/jobs/classify";
import { extractRequirements } from "@/lib/jobs/extract";
import { countIndexedChunks, retrieveEvidence } from "@/lib/jobs/retrieve";
import type { RetrievedChunk } from "@/lib/jobs/retrieve";
import {
  AnalysisError,
  PROMPT_VERSION,
  type ClassifiedRequirement,
} from "@/lib/jobs/types";
import { RUBRIC_VERSION, scoreMatches } from "@/lib/scoring";

export type AnalyzeJobInput = {
  cvId: string;
  company: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  url?: string | null;
  description: string;
};

export type AnalyzeJobResult = {
  applicationId: string;
  overallScore: number;
  requirementCount: number;
};

/**
 * End-to-end analysis. The LLM only extracts and classifies requirements; the
 * numeric score is always produced by src/lib/scoring.ts from those verdicts,
 * and every non-missing verdict carries a real CvChunk citation.
 */
export async function analyzeJob(
  userId: string,
  input: AnalyzeJobInput,
): Promise<AnalyzeJobResult> {
  const description = input.description.trim();

  if (description.length < 80) {
    throw new AnalysisError(
      422,
      "Paste at least a few sentences of the job description (80 characters minimum).",
    );
  }

  const cv = await prisma.cv.findFirst({
    where: { id: input.cvId, userId, parseStatus: "READY" },
    select: { id: true, title: true },
  });

  if (!cv) {
    throw new AnalysisError(
      400,
      "Choose a CV that has finished processing, then try again.",
    );
  }

  const indexedChunks = await countIndexedChunks(cv.id);
  if (indexedChunks === 0) {
    throw new AnalysisError(
      422,
      "This CV has no indexed passages. Re-upload it so it can be compared against the job.",
    );
  }

  const extraction = await extractRequirements(description);
  const requirements = extraction.requirements;

  if (requirements.length === 0) {
    throw new AnalysisError(
      422,
      "No requirements could be extracted from that description.",
    );
  }

  // Embed every requirement once, then retrieve the closest CV passages.
  const embeddings = await embedTexts(
    requirements.map((requirement) => requirement.text),
  );

  if (embeddings.vectors.length !== requirements.length) {
    throw new AnalysisError(
      502,
      "The embedding provider returned an unexpected result. Try again.",
    );
  }

  const candidates: RetrievedChunk[][] = [];
  for (const vector of embeddings.vectors) {
    const chunks = await retrieveEvidence(cv.id, vector, 4);
    if (chunks.length === 0) {
      throw new AnalysisError(
        422,
        "This CV has no indexed passages. Re-upload it and try again.",
      );
    }
    candidates.push(chunks);
  }

  const classification = await classifyRequirements(requirements, candidates);
  const scored = scoreMatches(classification.matches);

  const usedLlm =
    extraction.model !== "heuristic-v1" ||
    classification.model !== "heuristic-v1";
  const analysisModel = usedLlm ? env.OPENAI_CHAT_MODEL : "heuristic-v1";

  let applicationId: string;
  try {
    const application = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          userId,
          company: input.company.trim(),
          title: input.title.trim(),
          location: input.location?.trim() || null,
          employmentType: input.employmentType?.trim() || null,
          url: input.url?.trim() || null,
          description,
          requirements: {
            version: PROMPT_VERSION,
            model: extraction.model,
            requirements: extraction.requirements,
          } as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      const application = await tx.application.create({
        data: {
          userId,
          cvId: cv.id,
          jobId: job.id,
          status: "SAVED",
        },
        select: { id: true },
      });

      const analysis = await tx.analysis.create({
        data: {
          applicationId: application.id,
          cvId: cv.id,
          overallScore: scored.overallScore,
          dimensionScores: scored.dimensions as unknown as Prisma.InputJsonValue,
          matchedSkills: scored.matchedSkills,
          missingSkills: scored.missingSkills,
          summary: scored.summary,
          rubricVersion: RUBRIC_VERSION,
          promptVersion: PROMPT_VERSION,
          model: analysisModel,
          inputTokens: extraction.inputTokens + classification.inputTokens,
          outputTokens: extraction.outputTokens + classification.outputTokens,
        },
        select: { id: true },
      });

      await tx.requirementMatch.createMany({
        data: classification.matches.map((match) => toMatchRow(match, analysis.id)),
      });

      return application;
    });

    applicationId = application.id;
  } catch (error) {
    console.error("[jobs] failed to persist analysis", error);
    throw new AnalysisError(
      500,
      "We couldn't save this analysis. Try again in a moment.",
    );
  }

  await prisma.usageLog
    .createMany({
      data: [
        {
          userId,
          kind: "embedding",
          model: embeddings.model,
          inputTokens: embeddings.inputTokens,
        },
        {
          userId,
          kind: "job_analysis",
          model: analysisModel,
          inputTokens: extraction.inputTokens + classification.inputTokens,
          outputTokens:
            extraction.outputTokens + classification.outputTokens,
        },
      ],
    })
    .catch((error) => {
      console.error("[jobs] failed to write usage log", error);
    });

  return {
    applicationId,
    overallScore: scored.overallScore,
    requirementCount: classification.matches.length,
  };
}

function toMatchRow(
  match: ClassifiedRequirement,
  analysisId: string,
): Prisma.RequirementMatchCreateManyInput {
  return {
    analysisId,
    ordinal: match.ordinal,
    requirementText: match.text,
    requirementType: match.type,
    importance: match.importance,
    verdict: match.verdict,
    weight: match.weight,
    rationale: match.rationale,
    evidence: match.evidence as unknown as Prisma.InputJsonValue,
  };
}
