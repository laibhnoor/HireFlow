import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countUsageLog: vi.fn(),
  countCv: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    usageLog: { count: mocks.countUsageLog },
    cv: { count: mocks.countCv },
  },
}));

import {
  DAILY_LIMITS,
  getDailyUsage,
  nextUtcMidnight,
  quotaStatus,
  startOfUtcDay,
} from "@/lib/usage";

beforeEach(() => {
  mocks.countUsageLog.mockReset();
  mocks.countCv.mockReset();
});

describe("usage windows", () => {
  it("starts the day at UTC midnight and resets 24 hours later", () => {
    const now = new Date("2026-11-09T17:42:11.000Z");

    expect(startOfUtcDay(now).toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(nextUtcMidnight(now).toISOString()).toBe(
      "2026-11-10T00:00:00.000Z",
    );
  });
});

describe("quotaStatus", () => {
  const resetsAt = new Date("2026-11-10T00:00:00.000Z");

  it("allows usage below the limit", () => {
    const quota = quotaStatus(3, 5, resetsAt);

    expect(quota).toMatchObject({
      used: 3,
      limit: 5,
      remaining: 2,
      allowed: true,
    });
  });

  it("blocks at the limit and never reports negative remaining", () => {
    const quota = quotaStatus(7, 5, resetsAt);

    expect(quota.allowed).toBe(false);
    expect(quota.remaining).toBe(0);
  });
});

describe("getDailyUsage", () => {
  it("combines analysis, material and CV counts against their limits", async () => {
    mocks.countUsageLog
      .mockResolvedValueOnce(4) // job_analysis
      .mockResolvedValueOnce(9); // material kinds
    mocks.countCv.mockResolvedValueOnce(2);

    const usage = await getDailyUsage(
      "user_1",
      new Date("2026-11-09T09:00:00.000Z"),
    );

    expect(usage.analyses.used).toBe(4);
    expect(usage.analyses.limit).toBe(DAILY_LIMITS.analyses);
    expect(usage.materials.used).toBe(9);
    expect(usage.materials.limit).toBe(DAILY_LIMITS.materials);
    expect(usage.cvUploads.used).toBe(2);
    expect(usage.cvUploads.limit).toBe(DAILY_LIMITS.cvUploads);
    expect(usage.resetsAt.toISOString()).toBe("2026-11-10T00:00:00.000Z");

    // Both usage-log queries filter from UTC midnight.
    for (const call of mocks.countUsageLog.mock.calls) {
      expect(call[0].where.createdAt.gte.toISOString()).toBe(
        "2026-11-09T00:00:00.000Z",
      );
    }
  });
});
