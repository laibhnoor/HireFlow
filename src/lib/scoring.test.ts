import { describe, expect, it } from "vitest";

import type {
  ClassifiedRequirement,
  ImportanceValue,
  RequirementTypeValue,
} from "@/lib/jobs/types";
import { scoreMatches } from "@/lib/scoring";

function requirement({
  type = "SKILL",
  importance = "MUST_HAVE",
  verdict = "MATCHED",
  ordinal = 0,
  text = "A requirement",
}: {
  type?: RequirementTypeValue;
  importance?: ImportanceValue;
  verdict?: ClassifiedRequirement["verdict"];
  ordinal?: number;
  text?: string;
}): ClassifiedRequirement {
  return {
    ordinal,
    text,
    type,
    importance,
    verdict,
    rationale: "",
    evidence: [],
    weight: importance === "MUST_HAVE" ? 2 : 1,
  };
}

describe("scoreMatches", () => {
  it("gives a fully matched requirement set 100", () => {
    const result = scoreMatches([
      requirement({ ordinal: 0 }),
      requirement({
        ordinal: 1,
        importance: "NICE_TO_HAVE",
        verdict: "MATCHED",
      }),
    ]);

    expect(result.overallScore).toBe(100);
  });

  it("awards half credit for partial must-haves", () => {
    const result = scoreMatches([
      requirement({ verdict: "PARTIAL" }),
    ]);

    expect(result.overallScore).toBe(50);
  });

  it("redistributes dimensions that have no requirements", () => {
    const result = scoreMatches([
      requirement({ type: "EXPERIENCE", verdict: "MATCHED" }),
    ]);

    const experience = result.dimensions.find(
      (dimension) => dimension.key === "experience",
    );

    expect(experience?.applicable).toBe(true);
    expect(experience?.score).toBe(100);
    // Only the experience dimension applies, so its 25-point weight becomes
    // 100% of the score rather than being diluted to 25.
    expect(result.overallScore).toBe(100);
  });

  it("weights must-haves above nice-to-haves within one dimension", () => {
    const result = scoreMatches([
      requirement({
        ordinal: 0,
        type: "EXPERIENCE",
        importance: "MUST_HAVE",
        verdict: "MATCHED",
      }),
      requirement({
        ordinal: 1,
        type: "EXPERIENCE",
        importance: "NICE_TO_HAVE",
        verdict: "MISSING",
      }),
    ]);

    // 2 of 3 weighted points -> 67.
    expect(result.overallScore).toBe(67);
  });

  it("handles an empty requirement set without dividing by zero", () => {
    const result = scoreMatches([]);

    expect(result.overallScore).toBe(0);
    expect(result.summary).toContain("No explicit requirements");
  });
});
