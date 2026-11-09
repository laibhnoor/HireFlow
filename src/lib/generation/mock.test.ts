import { describe, expect, it } from "vitest";

import { generateMockMaterial } from "@/lib/generation/mock";
import type {
  MaterialContext,
  MaterialOptions,
} from "@/lib/generation/types";

const context: MaterialContext = {
  applicationId: "app_test",
  candidateName: "Alex Morgan",
  cvTitle: "Alex CV",
  job: {
    company: "Northwind Labs",
    title: "Senior Frontend Engineer",
    location: "London, UK",
    employmentType: "Full-time",
    description: "A role building analytics interfaces.",
  },
  analysis: {
    overallScore: 71,
    summary: "A credible match with one clear gap.",
    matchedSkills: ["TypeScript", "React"],
    missingSkills: ["Stakeholder management"],
    rubricVersion: "1.0",
  },
  requirements: [
    {
      ordinal: 0,
      text: "Expert-level TypeScript and React",
      type: "SKILL",
      importance: "MUST_HAVE",
      verdict: "MATCHED",
      weight: 2,
      rationale: "Direct evidence in your experience section.",
      evidence: [
        {
          section: "Experience",
          snippet: "Built React and TypeScript interfaces for analytics dashboards.",
        },
      ],
    },
    {
      ordinal: 1,
      text: "Experience building design systems",
      type: "SKILL",
      importance: "MUST_HAVE",
      verdict: "PARTIAL",
      weight: 2,
      rationale: "Adjacent evidence in your projects section.",
      evidence: [
        {
          section: "Projects",
          snippet: "Contributed components to a shared UI library.",
        },
      ],
    },
    {
      ordinal: 2,
      text: "Excellent communication and stakeholder management",
      type: "SKILL",
      importance: "MUST_HAVE",
      verdict: "MISSING",
      weight: 2,
      rationale: "No CV passage supports this requirement.",
      evidence: [],
    },
    {
      ordinal: 3,
      text: "Experience with performance profiling",
      type: "SKILL",
      importance: "NICE_TO_HAVE",
      verdict: "PARTIAL",
      weight: 1,
      rationale: "Some profiling evidence in your projects section.",
      evidence: [
        {
          section: "Projects",
          snippet: "Improved dashboard load time by profiling renders.",
        },
      ],
    },
  ],
};

const baseOptions: MaterialOptions = {
  type: "COVER_LETTER",
  tone: "professional",
  length: "standard",
  emphasis: "experience",
  horizon: "4_weeks",
  interviewFocus: "balanced",
  note: "",
};

describe("generateMockMaterial", () => {
  it("writes a cover letter from matched evidence only", () => {
    const letter = generateMockMaterial(context, baseOptions);

    expect(letter).toContain("Northwind Labs");
    expect(letter).toContain("Senior Frontend Engineer");
    expect(letter).toContain("Alex Morgan");
    expect(letter).toContain("TypeScript");
    // Missing requirements must never appear as a candidate claim.
    expect(letter.toLowerCase()).not.toContain("stakeholder management");
  });

  it("is deterministic", () => {
    expect(generateMockMaterial(context, baseOptions)).toBe(
      generateMockMaterial(context, baseOptions),
    );
  });

  it("never drafts a bullet for a missing requirement", () => {
    const suggestions = generateMockMaterial(context, {
      ...baseOptions,
      type: "CV_SUGGESTIONS",
    });

    expect(suggestions).toContain("# CV improvement suggestions");
    expect(suggestions).toContain("### Missing");
    expect(suggestions).toContain("No draft bullet — earn this first.");
    expect(suggestions).toContain("Draft bullet (verify before using)");
    expect(suggestions).toContain("## Strengths to keep");
  });

  it("turns missing requirements into roadmap steps, not claims", () => {
    const roadmap = generateMockMaterial(context, {
      ...baseOptions,
      type: "ROADMAP",
    });

    expect(roadmap).toContain("# Skill-gap roadmap");
    expect(roadmap).toContain("## Goal");
    expect(roadmap).toContain("Phase 1 — Build the missing must-haves");
    expect(roadmap).toContain("**Evidence to produce:**");
    expect(roadmap).toContain("**Done when:**");
    expect(roadmap).toContain("Excellent communication and stakeholder management");
    expect(roadmap).toContain("run a short written update");
    expect(roadmap).toContain("## Keep doing");
  });

  it("includes the longer horizon phase only for a 12-week plan", () => {
    const shortPlan = generateMockMaterial(context, {
      ...baseOptions,
      type: "ROADMAP",
    });
    const longPlan = generateMockMaterial(context, {
      ...baseOptions,
      type: "ROADMAP",
      horizon: "12_weeks",
    });

    expect(shortPlan).not.toContain("Phase 3");
    expect(longPlan).toContain("Phase 3");
  });

  it("builds interview questions from evidence and an honest gap script", () => {
    const interview = generateMockMaterial(context, {
      ...baseOptions,
      type: "INTERVIEW_PREP",
    });

    expect(interview).toContain("# Interview preparation");
    expect(interview).toContain("## Likely questions");
    expect(interview).toContain("**Answer outline (STAR):**");
    expect(interview).toContain("TypeScript");
    expect(interview).toContain("## Honest gap scripts");
    expect(interview).toContain("I don't yet have direct professional experience");
    // A missing requirement must never get an invented STAR result.
    expect(interview).toContain("No evidence yet — do not invent one");
  });
});
