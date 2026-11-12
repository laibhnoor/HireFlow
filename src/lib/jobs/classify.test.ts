import { describe, expect, it } from "vitest";

import { classifyRequirements } from "@/lib/jobs/classify";
import type {
  ExtractedRequirement,
  ImportanceValue,
} from "@/lib/jobs/types";
import type { RetrievedChunk } from "@/lib/jobs/retrieve";

function requirement(
  text: string,
  importance: ImportanceValue = "MUST_HAVE",
): ExtractedRequirement {
  return { text, type: "SKILL", importance };
}

function chunk(
  id: string,
  content: string,
  similarity: number,
  section = "Experience",
): RetrievedChunk {
  return { id, content, similarity, section };
}

describe("classifyRequirements (heuristic mode)", () => {
  it("marks a requirement MATCHED when the passage covers its key terms", async () => {
    const [match] = (
      await classifyRequirements(
        [requirement("TypeScript and React")],
        [[chunk("c1", "Built a component library in TypeScript and React.", 0.8)]],
      )
    ).matches;

    expect(match.verdict).toBe("MATCHED");
    expect(match.weight).toBe(2);
    expect(match.evidence).toHaveLength(1);
    expect(match.evidence[0].chunkId).toBe("c1");
    expect(match.rationale).toContain("Experience");
  });

  it("marks a requirement PARTIAL when only some terms are covered", async () => {
    const [match] = (
      await classifyRequirements(
        [requirement("Expert TypeScript React GraphQL accessibility")],
        [[chunk("c1", "TypeScript and React component library", 0.2)]],
      )
    ).matches;

    expect(match.verdict).toBe("PARTIAL");
    expect(match.evidence.map((item) => item.chunkId)).toEqual(["c1"]);
  });

  it("marks unrelated requirements MISSING without inventing evidence", async () => {
    const [match] = (
      await classifyRequirements(
        [requirement("Kubernetes and Terraform")],
        [
          [
            chunk(
              "c1",
              "Designed marketing campaigns and managed social media accounts.",
              0.2,
              "Projects",
            ),
          ],
        ],
      )
    ).matches;

    expect(match.verdict).toBe("MISSING");
    expect(match.evidence).toEqual([]);
    expect(match.rationale).toMatch(/No CV passage mentions/);
  });

  it("downgrades similarity-only matches to MISSING because there is no citation", async () => {
    const [match] = (
      await classifyRequirements(
        [requirement("Kubernetes and Terraform")],
        [
          [
            chunk(
              "c1",
              "Designed marketing campaigns and managed social media accounts.",
              0.9,
            ),
          ],
        ],
      )
    ).matches;

    expect(match.verdict).toBe("MISSING");
    expect(match.evidence).toEqual([]);
  });

  it("never cites a chunk that was not supplied for that requirement", async () => {
    const requirements = [
      requirement("TypeScript and React"),
      requirement("Kubernetes and Terraform"),
    ];
    const candidates = [
      [chunk("cv-typescript", "TypeScript and React at scale.", 0.9)],
      [chunk("cv-marketing", "Marketing campaigns and social media.", 0.1)],
    ];

    const { matches } = await classifyRequirements(requirements, candidates);
    const supplied = new Set(candidates.flat().map((item) => item.id));

    for (const match of matches) {
      if (match.verdict !== "MISSING") {
        expect(match.evidence.length).toBeGreaterThan(0);
        for (const evidence of match.evidence) {
          expect(supplied.has(evidence.chunkId)).toBe(true);
        }
      }
    }
  });

  it("uses the published rubric weight for nice-to-have requirements", async () => {
    const [match] = (
      await classifyRequirements(
        [requirement("TypeScript and React", "NICE_TO_HAVE")],
        [[chunk("c1", "TypeScript and React at scale.", 0.9)]],
      )
    ).matches;

    expect(match.weight).toBe(1);
  });
});
