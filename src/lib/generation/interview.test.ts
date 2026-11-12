import { describe, expect, it } from "vitest";

import { parseInterviewQuestions } from "@/lib/generation/interview";

const document = `# Interview preparation

## Likely questions

### Technical · Must-have: Expert-level TypeScript and React
**Question:** Which piece of work best demonstrates expert-level TypeScript and React?

**Why they ask:** It is a must-have in the job description.

**Answer outline (STAR):**
- **Situation:** Pick the moment behind your Experience evidence.
- **Task:** Explain the goal and constraints.
- **Action:** Describe what you personally did.
- **Result:** Give the outcome you can verify.

**Evidence to cite:** Your Experience passage about the component library.

**Follow-up to expect:** What was the hardest trade-off?

### Behavioural · Nice-to-have: Mentoring
**Question**: Tell me about a time you mentored someone.

**Answer outline (STAR):**
- **Situation:** The accessibility clinic.
- **Task:** Help three engineers grow.
- **Action:** Ran weekly reviews.
- **Result:** Two were promoted.

## Honest gap scripts

### GraphQL
**Say:** I don't yet have direct experience.
`;

describe("parseInterviewQuestions", () => {
  it("extracts structured questions from the likely-questions section", () => {
    const questions = parseInterviewQuestions(document);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      ordinal: 0,
      category: "TECHNICAL",
      question:
        "Which piece of work best demonstrates expert-level TypeScript and React?",
    });
    expect(questions[0].starHint).toContain("**Situation:**");
    expect(questions[0].starHint).toContain("**Evidence to cite:**");
    expect(questions[0].answer).toContain("**Follow-up to expect:**");

    // Tolerates the colon outside the bold markers.
    expect(questions[1].category).toBe("BEHAVIORAL");
    expect(questions[1].question).toBe(
      "Tell me about a time you mentored someone.",
    );
  });

  it("ignores gap scripts and returns nothing for unrelated documents", () => {
    expect(parseInterviewQuestions("## Honest gap scripts\n### GraphQL")).toEqual(
      [],
    );
    expect(parseInterviewQuestions("")).toEqual([]);
    expect(parseInterviewQuestions("# Cover letter\nDear team,")).toEqual([]);
  });

  it("does not create a row without a question", () => {
    const questions = parseInterviewQuestions(`## Likely questions
### Technical · Must-have: React
**Answer outline (STAR):**
- **Situation:** Something.
`);

    expect(questions).toEqual([]);
  });
});
