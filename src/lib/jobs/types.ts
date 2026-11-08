export type RequirementTypeValue =
  | "SKILL"
  | "EXPERIENCE"
  | "EDUCATION"
  | "PROJECT"
  | "CERTIFICATION"
  | "OTHER";

export type ImportanceValue = "MUST_HAVE" | "NICE_TO_HAVE";

export type VerdictValue = "MATCHED" | "PARTIAL" | "MISSING";

export type ExtractedRequirement = {
  text: string;
  type: RequirementTypeValue;
  importance: ImportanceValue;
};

export type Evidence = {
  chunkId: string;
  section: string;
  snippet: string;
  similarity: number;
};

export type ClassifiedRequirement = ExtractedRequirement & {
  ordinal: number;
  verdict: VerdictValue;
  rationale: string;
  evidence: Evidence[];
  /** 2 for must-have, 1 for nice-to-have. Used by the rubric. */
  weight: number;
};

export class AnalysisError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export type AnalyzeJobState = {
  error?: string;
};

export const PROMPT_VERSION = "2026-11-09.1";

export const REQUIREMENT_TYPE_LABELS: Record<RequirementTypeValue, string> = {
  SKILL: "Skill",
  EXPERIENCE: "Experience",
  EDUCATION: "Education",
  PROJECT: "Project",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

export const IMPORTANCE_LABELS: Record<ImportanceValue, string> = {
  MUST_HAVE: "Must-have",
  NICE_TO_HAVE: "Nice-to-have",
};

export const VERDICT_LABELS: Record<VerdictValue, string> = {
  MATCHED: "Matched",
  PARTIAL: "Partial",
  MISSING: "Missing",
};

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;
