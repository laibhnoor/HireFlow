import { prisma } from "@/lib/db";
import { MATERIAL_USAGE_KINDS } from "@/lib/generation/types";

/**
 * Daily, database-backed cost controls.
 *
 * UsageLog is the source of truth for AI calls, and Cv.createdAt for uploads.
 * Counting persisted rows instead of holding state in memory means the limits
 * survive restarts and work across instances.
 */
export const DAILY_LIMITS = {
  analyses: 20,
  materials: 40,
  cvUploads: 10,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function nextUtcMidnight(now: Date) {
  return new Date(startOfUtcDay(now).getTime() + DAY_MS);
}

export type Quota = {
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  resetsAt: Date;
};

export function quotaStatus(
  used: number,
  limit: number,
  resetsAt: Date,
): Quota {
  const safeUsed = Math.max(0, used);

  return {
    used: safeUsed,
    limit,
    remaining: Math.max(0, limit - safeUsed),
    allowed: safeUsed < limit,
    resetsAt,
  };
}

export function formatResetTime(resetsAt: Date) {
  return `${resetsAt.toISOString().slice(11, 16)} UTC`;
}

export function quotaMessage(label: string, quota: Quota) {
  return `Daily ${label} limit reached (${quota.used}/${quota.limit}). It resets at ${formatResetTime(quota.resetsAt)}.`;
}

async function countAnalysisUsage(userId: string, since: Date) {
  return prisma.usageLog.count({
    where: {
      userId,
      kind: "job_analysis",
      createdAt: { gte: since },
    },
  });
}

async function countMaterialUsage(userId: string, since: Date) {
  return prisma.usageLog.count({
    where: {
      userId,
      kind: { in: Object.values(MATERIAL_USAGE_KINDS) },
      createdAt: { gte: since },
    },
  });
}

async function countCvUploads(userId: string, since: Date) {
  return prisma.cv.count({
    where: { userId, createdAt: { gte: since } },
  });
}

export async function checkAnalysisQuota(
  userId: string,
  now = new Date(),
): Promise<Quota> {
  const used = await countAnalysisUsage(userId, startOfUtcDay(now));
  return quotaStatus(used, DAILY_LIMITS.analyses, nextUtcMidnight(now));
}

export async function checkMaterialQuota(
  userId: string,
  now = new Date(),
): Promise<Quota> {
  const used = await countMaterialUsage(userId, startOfUtcDay(now));
  return quotaStatus(used, DAILY_LIMITS.materials, nextUtcMidnight(now));
}

export async function checkCvUploadQuota(
  userId: string,
  now = new Date(),
): Promise<Quota> {
  const used = await countCvUploads(userId, startOfUtcDay(now));
  return quotaStatus(used, DAILY_LIMITS.cvUploads, nextUtcMidnight(now));
}

export async function getDailyUsage(userId: string, now = new Date()) {
  const since = startOfUtcDay(now);
  const resetsAt = nextUtcMidnight(now);

  const [analyses, materials, cvUploads] = await Promise.all([
    countAnalysisUsage(userId, since),
    countMaterialUsage(userId, since),
    countCvUploads(userId, since),
  ]);

  return {
    analyses: quotaStatus(analyses, DAILY_LIMITS.analyses, resetsAt),
    materials: quotaStatus(materials, DAILY_LIMITS.materials, resetsAt),
    cvUploads: quotaStatus(cvUploads, DAILY_LIMITS.cvUploads, resetsAt),
    resetsAt,
  };
}
