import {
  EMPHASIS_LABELS,
  LENGTH_LABELS,
  TONE_LABELS,
  type MaterialContext,
  type MaterialOptions,
} from "@/lib/generation/types";

export const MATERIAL_PROMPT_VERSION = "2026-11-09.1";

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
    system:
      options.type === "COVER_LETTER"
        ? COVER_LETTER_SYSTEM
        : SUGGESTIONS_SYSTEM,
    user:
      options.type === "COVER_LETTER"
        ? `Write the cover letter for this application.\n\n${JSON.stringify(payload)}`
        : `Write the CV improvement suggestions for this application.\n\n${JSON.stringify(payload)}`,
    maxTokens: options.type === "COVER_LETTER" ? 1200 : 1800,
    temperature: options.type === "COVER_LETTER" ? 0.5 : 0.2,
  };
}
