import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  MaterialError,
  type MaterialContext,
  type MaterialEvidence,
  type MaterialRequirement,
} from "@/lib/generation/types";

const MAX_SNIPPET = 260;
const MAX_EVIDENCE = 3;

/**
 * Loads everything a generation prompt needs in one query and normalizes the
 * JSON evidence blobs so prompts never see raw Prisma values.
 */
export async function loadMaterialContext(
  userId: string,
  applicationId: string,
): Promise<MaterialContext> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: {
      id: true,
      cv: { select: { title: true } },
      user: { select: { name: true } },
      job: {
        select: {
          company: true,
          title: true,
          location: true,
          employmentType: true,
          description: true,
        },
      },
      analysis: {
        select: {
          overallScore: true,
          summary: true,
          matchedSkills: true,
          missingSkills: true,
          rubricVersion: true,
          matches: {
            orderBy: { ordinal: "asc" },
            select: {
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

  if (!application) {
    throw new MaterialError(404, "That application could not be found.");
  }

  if (!application.analysis) {
    throw new MaterialError(
      422,
      "Analyse this job before generating application materials.",
    );
  }

  const requirements: MaterialRequirement[] = application.analysis.matches.map(
    (match) => ({
      ordinal: match.ordinal,
      text: match.requirementText,
      type: match.requirementType,
      importance: match.importance,
      verdict: match.verdict,
      weight: match.weight,
      rationale: match.rationale ?? "",
      evidence: readEvidence(match.evidence),
    }),
  );

  return {
    applicationId: application.id,
    candidateName: application.user.name,
    cvTitle: application.cv.title,
    job: {
      company: application.job.company,
      title: application.job.title,
      location: application.job.location,
      employmentType: application.job.employmentType,
      description: application.job.description,
    },
    analysis: {
      overallScore: application.analysis.overallScore,
      summary: application.analysis.summary,
      matchedSkills: application.analysis.matchedSkills,
      missingSkills: application.analysis.missingSkills,
      rubricVersion: application.analysis.rubricVersion,
    },
    requirements,
  };
}

function readEvidence(value: Prisma.JsonValue): MaterialEvidence[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;

      if (typeof record.snippet !== "string") return [];

      return [
        {
          section:
            typeof record.section === "string" ? record.section : "CV",
          snippet: record.snippet.slice(0, MAX_SNIPPET),
        },
      ];
    })
    .slice(0, MAX_EVIDENCE);
}
