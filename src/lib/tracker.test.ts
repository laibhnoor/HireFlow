import { describe, expect, it } from "vitest";

import {
  computeTrackerMetrics,
  groupApplicationsByStatus,
  groupEventsByDay,
  type TrackerApplication,
} from "@/lib/tracker";

function application(
  overrides: Partial<TrackerApplication> & { id: string },
): TrackerApplication {
  return {
    id: overrides.id,
    status: overrides.status ?? "SAVED",
    createdAt: overrides.createdAt ?? "2026-11-01T09:00:00.000Z",
    appliedAt: overrides.appliedAt ?? null,
    job: overrides.job ?? {
      company: "Northwind Labs",
      title: "Senior Frontend Engineer",
      location: "London",
    },
    analysis:
      overrides.analysis === undefined
        ? { overallScore: 70 }
        : overrides.analysis,
  };
}

describe("groupApplicationsByStatus", () => {
  it("places each status in its board column and merges closed outcomes", () => {
    const groups = groupApplicationsByStatus([
      application({ id: "saved", status: "SAVED" }),
      application({ id: "applied", status: "APPLIED" }),
      application({ id: "screening", status: "SCREENING" }),
      application({ id: "interview", status: "INTERVIEW" }),
      application({ id: "offer", status: "OFFER" }),
      application({ id: "rejected", status: "REJECTED" }),
      application({ id: "withdrawn", status: "WITHDRAWN" }),
    ]);

    expect(groups.SAVED.map((item) => item.id)).toEqual(["saved"]);
    expect(groups.APPLIED.map((item) => item.id)).toEqual(["applied"]);
    expect(groups.SCREENING.map((item) => item.id)).toEqual(["screening"]);
    expect(groups.INTERVIEW.map((item) => item.id)).toEqual(["interview"]);
    expect(groups.OFFER.map((item) => item.id)).toEqual(["offer"]);
    expect(groups.CLOSED.map((item) => item.id)).toEqual([
      "rejected",
      "withdrawn",
    ]);
  });
});

describe("computeTrackerMetrics", () => {
  it("counts activity, responses and average score", () => {
    const metrics = computeTrackerMetrics([
      application({ id: "saved", status: "SAVED", analysis: null }),
      application({
        id: "applied",
        status: "APPLIED",
        appliedAt: "2026-11-02T09:00:00.000Z",
        analysis: { overallScore: 60 },
      }),
      application({
        id: "interview",
        status: "INTERVIEW",
        appliedAt: "2026-11-03T09:00:00.000Z",
        analysis: { overallScore: 80 },
      }),
      application({
        id: "offer",
        status: "OFFER",
        appliedAt: "2026-11-04T09:00:00.000Z",
        analysis: { overallScore: 90 },
      }),
      application({
        id: "rejected",
        status: "REJECTED",
        appliedAt: "2026-11-05T09:00:00.000Z",
        analysis: { overallScore: 50 },
      }),
    ]);

    expect(metrics.total).toBe(5);
    expect(metrics.active).toBe(4);
    expect(metrics.submitted).toBe(4);
    expect(metrics.responded).toBe(3);
    expect(metrics.interviews).toBe(1);
    expect(metrics.offers).toBe(1);
    expect(metrics.closed).toBe(1);
    // 3 responses from 4 submitted applications.
    expect(metrics.responseRate).toBe(75);
    expect(metrics.averageScore).toBe(70);
  });

  it("returns null rates when there is nothing to measure", () => {
    const metrics = computeTrackerMetrics([]);

    expect(metrics.responseRate).toBeNull();
    expect(metrics.averageScore).toBeNull();
  });
});

describe("groupEventsByDay", () => {
  it("groups events by UTC day, newest first", () => {
    const days = groupEventsByDay([
      {
        id: "a",
        type: "STATUS_CHANGED",
        note: "Applied → Interview",
        createdAt: "2026-11-09T12:00:00.000Z",
      },
      {
        id: "b",
        type: "ANALYSIS_COMPLETED",
        note: null,
        createdAt: "2026-11-09T08:00:00.000Z",
      },
      {
        id: "c",
        type: "MATERIAL_GENERATED",
        note: "Cover letter v1",
        createdAt: "2026-11-08T18:00:00.000Z",
      },
    ]);

    expect(days.map((day) => day.date)).toEqual(["2026-11-09", "2026-11-08"]);
    expect(days[0].events.map((event) => event.id)).toEqual(["a", "b"]);
    expect(days[1].events.map((event) => event.id)).toEqual(["c"]);
  });
});
