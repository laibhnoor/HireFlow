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
  ],
};

const baseOptions: MaterialOptions = {
  type: "COVER_LETTER",
  tone: "professional",
  length: "standard",
  emphasis: "experience",
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
});
