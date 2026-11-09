export const MATERIAL_TYPES = ["COVER_LETTER", "CV_SUGGESTIONS"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TONES = ["professional", "enthusiastic", "concise"] as const;
export type MaterialTone = (typeof MATERIAL_TONES)[number];

export const MATERIAL_LENGTHS = ["short", "standard"] as const;
export type MaterialLength = (typeof MATERIAL_LENGTHS)[number];

export const MATERIAL_EMPHASES = ["skills", "experience", "projects"] as const;
export type MaterialEmphasis = (typeof MATERIAL_EMPHASES)[number];

export type MaterialOptions = {
  type: MaterialType;
  tone: MaterialTone;
  length: MaterialLength;
  emphasis: MaterialEmphasis;
  note: string;
};

export type MaterialEvidence = {
  section: string;
  snippet: string;
};

export type MaterialRequirement = {
  ordinal: number;
  text: string;
  type: string;
  importance: string;
  verdict: string;
  weight: number;
  rationale: string;
  evidence: MaterialEvidence[];
};

export type MaterialContext = {
  applicationId: string;
  candidateName: string;
  cvTitle: string;
  job: {
    company: string;
    title: string;
    location: string | null;
    employmentType: string | null;
    description: string;
  };
  analysis: {
    overallScore: number;
    summary: string;
    matchedSkills: string[];
    missingSkills: string[];
    rubricVersion: string;
  };
  requirements: MaterialRequirement[];
};

export class MaterialError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MaterialError";
  }
}

export const MATERIAL_TITLES: Record<MaterialType, string> = {
  COVER_LETTER: "Cover letter",
  CV_SUGGESTIONS: "CV improvement suggestions",
};

export const TONE_LABELS: Record<MaterialTone, string> = {
  professional: "Professional",
  enthusiastic: "Enthusiastic",
  concise: "Concise",
};

export const LENGTH_LABELS: Record<MaterialLength, string> = {
  short: "Short",
  standard: "Standard",
};

export const EMPHASIS_LABELS: Record<MaterialEmphasis, string> = {
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
};
