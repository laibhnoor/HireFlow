import { describe, expect, it } from "vitest";

import { extractRequirements } from "@/lib/jobs/extract";
import { AnalysisError } from "@/lib/jobs/types";

const structuredPosting = `About us
We are a fast-growing company building tools for busy teams.

Requirements
- 5+ years of experience building web applications
- Expert-level TypeScript and React
- Strong knowledge of PostgreSQL and SQL
- Experience with Docker and Kubernetes
- Familiarity with accessibility and design systems

Nice to have
- Experience with GraphQL
- AWS certification

Benefits
- Health insurance and stock options
- How to apply: click apply now
`;

describe("extractRequirements (heuristic mode)", () => {
  it("reads must-have and nice-to-have sections separately", async () => {
    const result = await extractRequirements(structuredPosting);

    expect(result.model).toBe("heuristic-v1");
    expect(result.requirements.length).toBeGreaterThanOrEqual(6);

    const typescript = result.requirements.find((item) =>
      item.text.includes("TypeScript"),
    );
    expect(typescript?.importance).toBe("MUST_HAVE");
    expect(typescript?.type).toBe("SKILL");

    const graphql = result.requirements.find((item) =>
      item.text.includes("GraphQL"),
    );
    expect(graphql?.importance).toBe("NICE_TO_HAVE");
  });

  it("does not treat the company intro or benefits as requirements", async () => {
    const result = await extractRequirements(structuredPosting);
    const joined = result.requirements.map((item) => item.text).join("\n");

    expect(joined).not.toContain("fast-growing");
    expect(joined).not.toContain("Health insurance");
    expect(joined).not.toContain("click apply");
  });

  it("splits a single-paragraph description into individual requirements", async () => {
    const paragraph =
      "We need a senior engineer with strong TypeScript and React experience. " +
      "The ideal candidate has five years building production web applications. " +
      "You should know PostgreSQL, Docker and AWS. " +
      "Familiarity with accessibility and design systems is preferred. " +
      "Experience with GraphQL is a bonus. " +
      "A degree in computer science or equivalent is desirable.";

    const result = await extractRequirements(paragraph);

    expect(result.requirements.length).toBeGreaterThanOrEqual(5);
    expect(
      result.requirements.some((item) => item.text.includes("PostgreSQL")),
    ).toBe(true);
    expect(
      result.requirements.some((item) => item.importance === "NICE_TO_HAVE"),
    ).toBe(true);
    expect(
      result.requirements.find((item) => item.text.includes("degree"))?.type,
    ).toBe("EDUCATION");
  });

  it("accepts a bulleted list with no headings and skips its preamble", async () => {
    const result = await extractRequirements(
      [
        "We are hiring a platform engineer to join our team.",
        "- TypeScript and React experience",
        "- PostgreSQL and SQL",
        "- Docker and Kubernetes",
        "- GraphQL APIs",
      ].join("\n"),
    );

    expect(result.requirements.map((item) => item.text)).toEqual([
      "TypeScript and React experience",
      "PostgreSQL and SQL",
      "Docker and Kubernetes",
      "GraphQL APIs",
    ]);
  });

  it("rejects a description that is too short to analyse", async () => {
    await expect(extractRequirements("Too short.")).rejects.toBeInstanceOf(
      AnalysisError,
    );

    await expect(extractRequirements("Too short.")).rejects.toMatchObject({
      status: 422,
    });
  });
});
