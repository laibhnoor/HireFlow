import { prisma } from "@/lib/db";
import { parseInterviewQuestions } from "@/lib/generation/interview";
import {
  MATERIAL_TITLES,
  MATERIAL_USAGE_KINDS,
  type MaterialType,
} from "@/lib/generation/types";

export type SavedMaterial = {
  id: string;
  version: number;
};

/**
 * Persists one completed generation as a new version. Aborted or failed
 * generations never reach this function.
 */
export async function saveGeneratedMaterial({
  userId,
  applicationId,
  type,
  content,
  model,
  promptVersion,
  inputTokens,
  outputTokens,
}: {
  userId: string;
  applicationId: string;
  type: MaterialType;
  content: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<SavedMaterial> {
  const latest = await prisma.generatedDoc.findFirst({
    where: { applicationId, type },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const version = (latest?.version ?? 0) + 1;

  const document = await prisma.generatedDoc.create({
    data: {
      applicationId,
      type,
      title: MATERIAL_TITLES[type],
      content,
      model,
      promptVersion,
      inputTokens,
      outputTokens,
      version,
    },
    select: { id: true, version: true },
  });

  await Promise.allSettled([
    prisma.usageLog.create({
      data: {
        userId,
        kind: MATERIAL_USAGE_KINDS[type],
        model,
        inputTokens,
        outputTokens,
      },
    }),
    prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "MATERIAL_GENERATED",
        note: `${MATERIAL_TITLES[type]} v${version}`,
      },
    }),
  ]);

  if (type === "INTERVIEW_PREP") {
    await saveInterviewQuestions(applicationId, content);
  }

  return { id: document.id, version: document.version };
}

/**
 * Keeps the structured practice bank in sync with the latest interview-prep
 * version. The document is the source of truth; a parser failure must never
 * roll back a saved document.
 */
async function saveInterviewQuestions(
  applicationId: string,
  content: string,
) {
  const questions = parseInterviewQuestions(content);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.interviewQuestion.deleteMany({ where: { applicationId } });

      if (questions.length === 0) return;

      await tx.interviewQuestion.createMany({
        data: questions.map((question) => ({
          applicationId,
          category: question.category,
          question: question.question,
          starHint: question.starHint || null,
          answer: question.answer || null,
          ordinal: question.ordinal,
        })),
      });
    });
  } catch (error) {
    console.error("[generation] failed to persist interview questions", error);
  }
}
