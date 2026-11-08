import { clampText, uniqueStrings } from "@/lib/text";
import type {
  ClassifiedRequirement,
  ImportanceValue,
  RequirementTypeValue,
  VerdictValue,
} from "@/lib/jobs/types";

/**
 * Rubric v1.0 — the single published source of weights. The LLM never chooses
 * the score: it only classifies each requirement, and application code applies
 * these weights to the verdicts.
 *
 * Requirement verdicts are worth MATCHED = 1, PARTIAL = 0.5, MISSING = 0.
 * Requirement weights are MUST_HAVE = 2, NICE_TO_HAVE = 1.
 * A dimension with no matching requirements is marked inapplicable and its
 * weight is redistributed proportionally across the remaining dimensions, so a
 * role that asks for no education does not silently lose 15 points.
 */
export const RUBRIC_VERSION = "1.0";

export const VERDICT_POINTS: Record<VerdictValue, number> = {
  MATCHED: 1,
  PARTIAL: 0.5,
  MISSING: 0,
};

export const IMPORTANCE_WEIGHT: Record<ImportanceValue, number> = {
  MUST_HAVE: 2,
  NICE_TO_HAVE: 1,
};

export type DimensionKey =
  | "must_have"
  | "experience"
  | "education"
  | "projects"
  | "keywords";

export type RubricDimension = {
  key: DimensionKey;
  label: string;
  weight: number;
  description: string;
};

export const RUBRIC: RubricDimension[] = [
  {
    key: "must_have",
    label: "Must-have skills",
    weight: 40,
    description: "Essential skills and non-negotiable requirements.",
  },
  {
    key: "experience",
    label: "Relevant experience",
    weight: 25,
    description: "Years, scope and depth of relevant work.",
  },
  {
    key: "education",
    label: "Education & certifications",
    weight: 15,
    description: "Degrees, licences and professional certifications.",
  },
  {
    key: "projects",
    label: "Projects & portfolio",
    weight: 10,
    description: "Shipped work, open source and portfolio evidence.",
  },
  {
    key: "keywords",
    label: "Seniority & ATS keywords",
    weight: 10,
    description: "Preferred skills and role-specific keywords.",
  },
];

export type DimensionScore = RubricDimension & {
  score: number;
  detail: string;
  applicable: boolean;
};

export type ScoreResult = {
  overallScore: number;
  dimensions: DimensionScore[];
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
};

export function dimensionFor(
  type: RequirementTypeValue,
  importance: ImportanceValue,
): DimensionKey {
  if (type === "EXPERIENCE") return "experience";
  if (type === "EDUCATION" || type === "CERTIFICATION") return "education";
  if (type === "PROJECT") return "projects";
  return importance === "MUST_HAVE" ? "must_have" : "keywords";
}

export function countVerdicts(matches: ClassifiedRequirement[]) {
  return {
    matched: matches.filter((match) => match.verdict === "MATCHED").length,
    partial: matches.filter((match) => match.verdict === "PARTIAL").length,
    missing: matches.filter((match) => match.verdict === "MISSING").length,
    total: matches.length,
  };
}

export function scoreMatches(
  matches: ClassifiedRequirement[],
): ScoreResult {
  const groups = new Map<DimensionKey, ClassifiedRequirement[]>();
  for (const match of matches) {
    const key = dimensionFor(match.type, match.importance);
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  const dimensions: DimensionScore[] = RUBRIC.map((definition) => {
    const items = groups.get(definition.key) ?? [];

    if (items.length === 0) {
      return {
        ...definition,
        score: 0,
        applicable: false,
        detail: "No requirements of this kind were found in the description.",
      };
    }

    const totalWeight = items.reduce(
      (total, item) => total + Math.max(1, item.weight),
      0,
    );
    const earnedWeight = items.reduce(
      (total, item) =>
        total + VERDICT_POINTS[item.verdict] * Math.max(1, item.weight),
      0,
    );
    const counts = countVerdicts(items);

    return {
      ...definition,
      score: Math.round((earnedWeight / Math.max(1, totalWeight)) * 100),
      applicable: true,
      detail: `${counts.matched} matched, ${counts.partial} partial, ${counts.missing} missing across ${counts.total} requirement${
        counts.total === 1 ? "" : "s"
      }.`,
    };
  });

  const applicable = dimensions.filter((dimension) => dimension.applicable);
  const totalWeight = applicable.reduce(
    (total, dimension) => total + dimension.weight,
    0,
  );
  const overallScore =
    totalWeight === 0
      ? 0
      : Math.round(
          applicable.reduce(
            (total, dimension) =>
              total + (dimension.score * dimension.weight) / totalWeight,
            0,
          ),
        );

  const matchedSkills = uniqueStrings(
    matches
      .filter((match) => match.verdict === "MATCHED")
      .map((match) => clampText(match.text, 90)),
  ).slice(0, 12);

  const missingSkills = uniqueStrings(
    matches
      .filter((match) => match.verdict === "MISSING")
      .map((match) => clampText(match.text, 90)),
  ).slice(0, 12);

  return {
    overallScore,
    dimensions,
    matchedSkills,
    missingSkills,
    summary: buildSummary(overallScore, dimensions, matches),
  };
}

function buildSummary(
  overallScore: number,
  dimensions: DimensionScore[],
  matches: ClassifiedRequirement[],
) {
  const counts = countVerdicts(matches);
  const applicable = [...dimensions]
    .filter((dimension) => dimension.applicable)
    .sort((a, b) => b.score - a.score);

  if (counts.total === 0) {
    return "No explicit requirements were found in this description, so a reliable match score could not be produced.";
  }

  const strongest = applicable[0];
  const weakest = applicable[applicable.length - 1];

  const band =
    overallScore >= 80
      ? "This is a strong match on the evidence in your CV."
      : overallScore >= 60
        ? "This is a credible match with a few clear gaps."
        : overallScore >= 40
          ? "This is a partial match — target the gaps before applying."
          : "This is a weak match on your current CV; focus on the gaps first.";

  const parts = [
    `You directly evidence ${counts.matched} of ${counts.total} requirements, partially cover ${counts.partial}, and have no CV evidence for ${counts.missing}.`,
    band,
  ];

  if (strongest && weakest && applicable.length > 1) {
    parts.push(
      `Strongest area: ${strongest.label} (${strongest.score}%). Biggest gap: ${weakest.label} (${weakest.score}%).`,
    );
  }

  return parts.join(" ");
}
