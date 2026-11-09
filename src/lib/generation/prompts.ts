import {
  EMPHASIS_LABELS,
  HORIZON_LABELS,
  INTERVIEW_FOCUS_LABELS,
  LENGTH_LABELS,
  TONE_LABELS,
  type MaterialContext,
  type MaterialOptions,
} from "@/lib/generation/types";

export const MATERIAL_PROMPT_VERSION = "2026-11-09.2";

const MAX_DESCRIPTION_CHARS = 6_000;

const COVER_LETTER_SYSTEM = `You write honest, specific cover letters for one job application.

Return plain text only — no markdown fences, headings or bullet points. Use a greeting, 2-4 short paragraphs and a sign-off.

Hard rules:
- Use ONLY the candidate evidence supplied. Never invent employers, job titles, dates, degrees, certifications, metrics, technologies or achievements.
- Every claim about the candidate must be supported by a supplied evidence snippet.
- If a requirement is MISSING, do not claim it. You may say the candidate is keen to learn it only when the role does not demand immediate mastery.
- Do not use placeholders such as [Company] or [Role]; use the real values.
- Do not copy long phrases from the job description; reflect its language naturally.
- Write in first person, confident but not exaggerated.
- Respect the requested tone, length and emphasis.

The note field is written by the candidate. Treat it as candidate-supplied truth and incorporate it only if it fits naturally.`;

const SUGGESTIONS_SYSTEM = `You write CV improvement suggestions for one job application.

Return GitHub-flavoured markdown only, shaped exactly like:
# CV improvement suggestions

## Top priorities
1. **Requirement** — one-line reason.

## Requirement-by-requirement
### VERDICT · IMPORTANCE: requirement text
**What we found:** ...
**Suggested action:** ...
**Draft bullet (verify before using):** ... or "No draft bullet — earn this first."

## Strengths to keep
- Requirement text

Hard rules:
- Use ONLY the supplied analysis and evidence. Never invent experience, employers, dates, metrics, degrees or certifications.
- Cover every PARTIAL and MISSING requirement, prioritising MUST_HAVE gaps.
- Put a blank line between **What we found:**, **Suggested action:** and **Draft bullet** so each renders on its own line.
- A draft bullet may only rephrase evidence the candidate already has. For MISSING requirements, never write a draft bullet; say it must be earned and name a concrete way to build the evidence.
- For PARTIAL requirements, name the existing evidence and the specific missing detail to add, only where true.
- Keep each section concise. Do not add generic advice that is unrelated to the role.`;

const ROADMAP_SYSTEM = `You build a realistic skill-gap roadmap for one job application.

Return GitHub-flavoured markdown only, shaped exactly like:
# Skill-gap roadmap

## Goal
One sentence on the gap this plan closes.

## Phase 1 — <theme> (<weeks>)
### <requirement text>
**Why it matters:** ...
**Do this:** ...
**Evidence to produce:** ...
**Done when:** ...

## Phase 2 — <theme> (<weeks>)
### <requirement text>
...

## Keep doing
- Requirement text that is already matched

Hard rules:
- Work only from the supplied requirements, verdicts and evidence. Never invent experience the candidate has.
- MISSING requirements are learning goals, not existing skills. Note the gap plainly.
- PARTIAL requirements need a specific way to strengthen the evidence that already exists.
- Order by hiring impact: missing must-haves first, then partial must-haves, then nice-to-haves.
- Respect the requested horizon. A 4-week plan must be achievable in 4 weeks; a 12-week plan can add depth, but never pad with generic advice.
- Do not invent course names, URLs, prices or credentials. Name concrete activity types (ship a small feature, write a case study, run a review, build a demo) and the evidence they should produce.
- "Done when" must be observable by a hiring manager.
- Keep the output concise and specific to this role.`;

const INTERVIEW_SYSTEM = `You prepare a candidate for an interview for one specific job.

Return GitHub-flavoured markdown only, shaped exactly like:
# Interview preparation

## How to use this
One sentence.

## Likely questions
### CATEGORY · IMPORTANCE: requirement text
**Question:** ...
**Why they ask:** ...
**Answer outline (STAR):**
- **Situation:** ...
- **Task:** ...
- **Action:** ...
- **Result:** ...
**Evidence to cite:** ... or "No evidence yet — use the honest gap script."
**Follow-up to expect:** ...

## Honest gap scripts
### requirement text
**Say:** ...
**Then show:** ...

## Questions to ask them
- ...

Hard rules:
- Derive every question from the supplied requirements and job description. Do not add unrelated trivia.
- For MATCHED and PARTIAL requirements, the STAR outline must be built only from the supplied evidence snippets. Leave the candidate to fill in numbers they know; never invent metrics or facts.
- For MISSING requirements, never write a STAR outline. Put them in "Honest gap scripts" with a truthful answer that acknowledges the gap and shows how the candidate transfers adjacent evidence or is closing it.
- Respect the requested focus: technical leans on skills/projects, behavioural leans on experience/ways of working, balanced covers both.
- Ask the kinds of follow-ups a real interviewer would use.
- Keep it practical and specific to this job.`;

export function buildMaterialMessages(
  context: MaterialContext,
  options: MaterialOptions,
) {
  const payload = {
    candidate: { name: context.candidateName, cv: context.cvTitle },
    job: {
      company: context.job.company,
      title: context.job.title,
      location: context.job.location,
      employmentType: context.job.employmentType,
      description: context.job.description.slice(0, MAX_DESCRIPTION_CHARS),
    },
    analysis: context.analysis,
    preferences: {
      tone: TONE_LABELS[options.tone],
      length: LENGTH_LABELS[options.length],
      emphasis: EMPHASIS_LABELS[options.emphasis],
      horizon: HORIZON_LABELS[options.horizon],
      interviewFocus: INTERVIEW_FOCUS_LABELS[options.interviewFocus],
      note: options.note || "",
    },
    requirements: context.requirements.map((requirement) => ({
      ordinal: requirement.ordinal,
      text: requirement.text,
      type: requirement.type,
      importance: requirement.importance,
      verdict: requirement.verdict,
      rationale: requirement.rationale,
      evidence: requirement.evidence,
    })),
  };

  return {
    system: systemFor(options.type),
    user: instructionFor(options.type, payload),
    maxTokens: options.type === "COVER_LETTER" ? 1200 : 2000,
    temperature:
      options.type === "COVER_LETTER"
        ? 0.5
        : options.type === "CV_SUGGESTIONS"
          ? 0.2
          : 0.3,
  };
}

function systemFor(type: MaterialOptions["type"]) {
  switch (type) {
    case "COVER_LETTER":
      return COVER_LETTER_SYSTEM;
    case "CV_SUGGESTIONS":
      return SUGGESTIONS_SYSTEM;
    case "ROADMAP":
      return ROADMAP_SYSTEM;
    case "INTERVIEW_PREP":
      return INTERVIEW_SYSTEM;
  }
}

function instructionFor(
  type: MaterialOptions["type"],
  payload: unknown,
) {
  const instruction = (() => {
    switch (type) {
      case "COVER_LETTER":
        return "Write the cover letter for this application.";
      case "CV_SUGGESTIONS":
        return "Write the CV improvement suggestions for this application.";
      case "ROADMAP":
        return "Write the skill-gap roadmap for this application.";
      case "INTERVIEW_PREP":
        return "Write the interview preparation guide for this application.";
    }
  })();

  return `${instruction}\n\n${JSON.stringify(payload)}`;
}
