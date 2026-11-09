export const MATERIAL_TYPES = [
  "COVER_LETTER",
  "CV_SUGGESTIONS",
  "ROADMAP",
  "INTERVIEW_PREP",
] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TONES = ["professional", "enthusiastic", "concise"] as const;
export type MaterialTone = (typeof MATERIAL_TONES)[number];

export const MATERIAL_LENGTHS = ["short", "standard"] as const;
export type MaterialLength = (typeof MATERIAL_LENGTHS)[number];

export const MATERIAL_EMPHASES = ["skills", "experience", "projects"] as const;
export type MaterialEmphasis = (typeof MATERIAL_EMPHASES)[number];

export const ROADMAP_HORIZONS = ["4_weeks", "12_weeks"] as const;
export type RoadmapHorizon = (typeof ROADMAP_HORIZONS)[number];

export const INTERVIEW_FOCUSES = [
  "balanced",
  "technical",
  "behavioural",
] as const;
export type InterviewFocus = (typeof INTERVIEW_FOCUSES)[number];

export type MaterialOptions = {
  type: MaterialType;
  tone: MaterialTone;
  length: MaterialLength;
  emphasis: MaterialEmphasis;
  horizon: RoadmapHorizon;
  interviewFocus: InterviewFocus;
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
  ROADMAP: "Skill-gap roadmap",
  INTERVIEW_PREP: "Interview preparation",
};

export const MATERIAL_USAGE_KINDS: Record<MaterialType, string> = {
  COVER_LETTER: "cover_letter",
  CV_SUGGESTIONS: "cv_suggestions",
  ROADMAP: "roadmap",
  INTERVIEW_PREP: "interview_prep",
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

export const HORIZON_LABELS: Record<RoadmapHorizon, string> = {
  "4_weeks": "4 weeks",
  "12_weeks": "12 weeks",
};

export const INTERVIEW_FOCUS_LABELS: Record<InterviewFocus, string> = {
  balanced: "Balanced",
  technical: "Technical",
  behavioural: "Behavioural",
};
