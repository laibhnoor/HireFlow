import { prisma } from "@/lib/db";
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

  return { id: document.id, version: document.version };
}
