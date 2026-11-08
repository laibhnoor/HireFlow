import { z } from "zod";

import { chatJson } from "@/lib/ai/chat";
import { env } from "@/lib/env";
import { clampText, normalizeWhitespace, splitSentences, uniqueStrings } from "@/lib/text";
import {
  AnalysisError,
  type ExtractedRequirement,
  type ImportanceValue,
  type RequirementTypeValue,
} from "@/lib/jobs/types";

export type ExtractionResult = {
  requirements: ExtractedRequirement[];
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const MAX_REQUIREMENTS = 20;
const MAX_DESCRIPTION_CHARS = 24_000;

const UPPER = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const llmSchema = z.object({
  requirements: z
    .array(
      z.object({
        text: z.string().min(3).max(300),
        type: z.preprocess(
          UPPER,
          z.enum(["SKILL", "EXPERIENCE", "EDUCATION", "PROJECT", "CERTIFICATION", "OTHER"]),
        ),
        importance: z.preprocess(UPPER, z.enum(["MUST_HAVE", "NICE_TO_HAVE"])),
      }),
    )
    .min(1)
    .max(24),
});

const SYSTEM_PROMPT = `You extract hiring requirements from job descriptions.

Return JSON only, shaped exactly like:
{"requirements":[{"text":"...","type":"SKILL","importance":"MUST_HAVE"}]}

Rules:
- text: one concrete requirement, under 180 characters, phrased as the employer states it. Do not add requirements that are not in the description.
- type: SKILL, EXPERIENCE, EDUCATION, PROJECT, CERTIFICATION or OTHER.
- importance: MUST_HAVE when required/essential or listed under requirements/qualifications; NICE_TO_HAVE when preferred, bonus, desirable or "a plus".
- Extract 6-20 requirements. Prefer specific skills, tools, seniority and domain experience.
- Ignore company blurb, perks, salary, benefits, EEO statements and application instructions.
- Do not invent, merge unrelated ideas, or rewrite the candidate's CV.`;

export async function extractRequirements(
  description: string,
): Promise<ExtractionResult> {
  const trimmed = description.trim();
  if (trimmed.length < 40) {
    throw new AnalysisError(
      422,
      "That job description is too short to analyse. Paste the requirements or responsibilities section.",
    );
  }

  if (!env.llmMockMode) {
    try {
      const result = await chatJson({
        system: SYSTEM_PROMPT,
        user: `Job description:\n"""\n${trimmed.slice(0, MAX_DESCRIPTION_CHARS)}\n"""`,
        schema: llmSchema,
        maxTokens: 1600,
      });

      const requirements = normalizeRequirements(
        result.data.requirements.map((item) => ({
          text: item.text,
          type: item.type,
          importance: item.importance,
        })),
      );

      if (requirements.length > 0) {
        return {
          requirements,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      }
    } catch (error) {
      console.warn(
        "[jobs] LLM requirement extraction failed; using heuristic fallback",
        error,
      );
    }
  }

  return {
    requirements: heuristicRequirements(trimmed),
    model: "heuristic-v1",
    inputTokens: 0,
    outputTokens: 0,
  };
}

function normalizeRequirements(items: ExtractedRequirement[]) {
  const seen = new Set<string>();
  const cleaned: ExtractedRequirement[] = [];

  for (const item of items) {
    const text = clampText(
      normalizeWhitespace(item.text).replace(/^["'“”]+|["'“”]+$/g, ""),
      200,
    );
    if (text.length < 3) continue;

    const key = dedupeKey(text);
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({ text, type: item.type, importance: item.importance });
  }

  return cleaned.slice(0, MAX_REQUIREMENTS);
}

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

type Section = "must" | "nice" | "duties" | "skip";

const HEADING_RULES: Array<{ pattern: RegExp; section: Section }> = [
  {
    pattern:
      /^(nice[- ]to[- ]haves?|preferred( qualifications)?|bonus( points)?|desirable|good to have)\b/i,
    section: "nice",
  },
  {
    pattern:
      /^(responsibilities|what you.?ll do|the role|your role|day[- ]to[- ]day|key duties|duties|the job)\b/i,
    section: "duties",
  },
  {
    pattern:
      /^(benefits|perks|what we offer|compensation|salary|package|about (us|the company|the team|the role)|the opportunity|overview|equal opportunity|how to apply|next steps)\b/i,
    section: "skip",
  },
  {
    pattern:
      /^(requirements?|qualifications?|must[- ]haves?|what you.?ll need|what we.?re looking for|who you are|about you|skills|experience|education)\b/i,
    section: "must",
  },
];

const NICE_PATTERN =
  /\b(nice[- ]to[- ]have|preferred|bonus|desirable|advantageous|a plus|ideally)\b/i;

const EXPERIENCE_PATTERN =
  /\b(\d+\+?\s*(years?|yrs?)|experience (in|with|building|leading|shipping)|track record|proven experience|background in|you have (built|led|worked))\b/i;

const EDUCATION_PATTERN =
  /\b(degree|bachelor|master|phd|doctorate|bsc|msc|mba|university|equivalent qualification)\b/i;

const CERTIFICATION_PATTERN =
  /\b(certif\w*|accredit\w*|licen[cs]e|pmp|scrum master|cpa|aws certified|azure certified|google cloud certified)\b/i;

const PROJECT_PATTERN =
  /\b(portfolio|github|open[- ]source|side project|personal project|published|public repo|shipped)\b/i;

const SKILL_PATTERN =
  /\b(typescript|javascript|python|java|golang|rust|ruby|php|c\+\+|c#|sql|postgres(ql)?|mysql|mongodb|redis|react|next\.?js|vue|angular|svelte|node\.?js|express|django|flask|rails|spring|tailwind|css|html|graphql|rest|grpc|aws|gcp|azure|docker|kubernetes|terraform|figma|sketch|git|github|gitlab|ci\/cd|playwright|vitest|jest|storybook|accessibility|a11y|design system|machine learning|ml|llm|openai|pytorch|tensorflow|pandas|numpy|spark|kafka|airflow|tableau|power bi|excel|seo|analytics|agile|scrum|kanban|jira|communication|stakeholder|leadership|mentor\w*|proficien\w*|knowledge of|familiar\w*|expertise|hands-on)\b/i;

const SKIP_PATTERN =
  /\b(equal opportunity|visa sponsorship|we offer|holiday|pension|health insurance|salary range|how to apply|click apply|apply now|remote-first|hybrid working|stock options|parental leave)\b/i;

const COMPANY_PATTERN =
  /^(we are|we’re|we're|our (mission|team|company|culture)|about us|founded in|we believe|this role|this position|the opportunity)\b/i;

const RECRUITING_PATTERN =
  /\b(is (hiring|looking for|seeking|recruiting)|are (hiring|looking for|seeking|recruiting)|join (our|the) team|we('| a)re (hiring|looking|seeking)|role (is|will) (based|report)|you will report)\b/i;

function heuristicRequirements(description: string): ExtractedRequirement[] {
  const drafts: ExtractedRequirement[] = [];
  let section: Section = "must";

  for (const rawLine of description.replace(/\r\n?/g, "\n").split("\n")) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;

    const heading = detectHeading(line);
    if (heading) {
      section = heading;
      continue;
    }
    if (section === "skip") continue;

    const pieces = line.length > 320 ? splitSentences(line) : [line];
    for (const piece of pieces) {
      const cleaned = cleanRequirement(piece);
      if (!cleaned) continue;
      drafts.push(buildRequirement(cleaned, section));
    }
  }

  // Pasting a description without line breaks is common. Fall back to sentences.
  if (drafts.length < 6) {
    const sentences = splitSentences(description.replace(/\n+/g, " "));
    for (const sentence of sentences) {
      if (drafts.length >= 10) break;
      const cleaned = cleanRequirement(sentence);
      if (!cleaned) continue;
      drafts.push(buildRequirement(cleaned, "must"));
    }
  }

  const seen = new Set<string>();
  const unique = drafts.filter((draft) => {
    const key = dedupeKey(draft.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const must = unique.filter((item) => item.importance === "MUST_HAVE");
  const nice = unique.filter((item) => item.importance === "NICE_TO_HAVE");

  const picked = [
    ...must.slice(0, 16),
    ...nice.slice(0, Math.max(4, MAX_REQUIREMENTS - Math.min(16, must.length))),
  ].slice(0, MAX_REQUIREMENTS);

  if (picked.length === 0) {
    throw new AnalysisError(
      422,
      "We couldn't find any requirements in that description. Paste the role's responsibilities or qualifications section and try again.",
    );
  }

  return picked;
}

function detectHeading(line: string): Section | null {
  if (line.length > 70 || /[.!?]$/.test(line)) return null;

  for (const rule of HEADING_RULES) {
    if (rule.pattern.test(line)) return rule.section;
  }

  const words = line.split(" ");
  if (
    words.length <= 8 &&
    /[A-Z]/.test(line) &&
    line === line.toUpperCase()
  ) {
    return "must";
  }

  return null;
}

function cleanRequirement(value: string) {
  const cleaned = normalizeWhitespace(
    value
      .replace(/^[\s\-–—•*·▪◦]+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/^[•·]\s*/, ""),
  ).replace(/[;:,]$/, "");

  if (cleaned.length < 12 || cleaned.length > 320) return null;
  if (!/[a-z]/i.test(cleaned)) return null;
  if (SKIP_PATTERN.test(cleaned)) return null;
  if (COMPANY_PATTERN.test(cleaned)) return null;
  if (RECRUITING_PATTERN.test(cleaned)) return null;
  if (/@|https?:\/\//i.test(cleaned)) return null;

  return cleaned;
}

function buildRequirement(text: string, section: Section): ExtractedRequirement {
  const importance: ImportanceValue =
    section === "nice" || NICE_PATTERN.test(text) ? "NICE_TO_HAVE" : "MUST_HAVE";

  return {
    text: clampText(text, 200),
    type: classifyType(text, section),
    importance,
  };
}

function classifyType(text: string, section: Section): RequirementTypeValue {
  if (EDUCATION_PATTERN.test(text)) return "EDUCATION";
  if (CERTIFICATION_PATTERN.test(text)) return "CERTIFICATION";
  if (PROJECT_PATTERN.test(text)) return "PROJECT";
  if (EXPERIENCE_PATTERN.test(text)) return "EXPERIENCE";
  if (SKILL_PATTERN.test(text)) return "SKILL";
  if (section === "duties") return "EXPERIENCE";
  return "OTHER";
}

function dedupeKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function uniqueRequirementTexts(items: ExtractedRequirement[]) {
  return uniqueStrings(items.map((item) => item.text));
}
