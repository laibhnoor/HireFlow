import { z } from "zod";

import { chatJson } from "@/lib/ai/chat";
import { env } from "@/lib/env";
import {
  AnalysisError,
  type ClassifiedRequirement,
  type Evidence,
  type ExtractedRequirement,
  type VerdictValue,
} from "@/lib/jobs/types";
import type { RetrievedChunk } from "@/lib/jobs/retrieve";
import { clampSimilarity } from "@/lib/jobs/retrieve";
import { IMPORTANCE_WEIGHT } from "@/lib/scoring";
import { clampText, keywords } from "@/lib/text";

export type ClassificationResult = {
  matches: ClassifiedRequirement[];
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const MAX_PASSAGES = 4;
const BATCH_SIZE = 6;

const UPPER = (value: unknown) =>
  String(value ?? "").toUpperCase();

const llmSchema = z.object({
  results: z
    .array(
      z.object({
        ordinal: z.coerce.number().int().min(0),
        verdict: z.preprocess(
          UPPER,
          z.enum(["MATCHED", "PARTIAL", "MISSING"]),
        ),
        rationale: z.string().max(600).optional().default(""),
        evidenceChunkIds: z.array(z.string()).max(4).optional().default([]),
      }),
    )
    .min(1),
});

const SYSTEM_PROMPT = `You assess a candidate's CV against job requirements using ONLY the CV passages supplied.

Return JSON only, shaped exactly like:
{"results":[{"ordinal":0,"verdict":"MATCHED","rationale":"...","evidenceChunkIds":["chunk-id"]}]}

Verdict rules:
- MATCHED: a passage directly demonstrates the requirement — same skill, tool, scope or achievement.
- PARTIAL: a passage shows adjacent or transferable evidence, but does not fully cover the requirement.
- MISSING: no supplied passage supports the requirement.
- Cite 1-2 passage ids for MATCHED and PARTIAL. Use only ids from that requirement's passages.
- If you cannot cite a passage, the verdict must be MISSING.
- Never infer experience, seniority, education or skills that are not written in a passage.
- Keep each rationale under 240 characters and point to the cited passage.
- Return exactly one result for every ordinal.`;

export async function classifyRequirements(
  requirements: ExtractedRequirement[],
  candidates: RetrievedChunk[][],
): Promise<ClassificationResult> {
  const heuristic = () =>
    requirements.map((requirement, ordinal) =>
      heuristicVerdict(requirement, ordinal, candidates[ordinal] ?? []),
    );

  if (env.llmMockMode) {
    return {
      matches: heuristic(),
      model: "heuristic-v1",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  try {
    const result = await classifyWithLlm(requirements, candidates);
    const byOrdinal = new Map(
      result.matches.map((match) => [match.ordinal, match]),
    );
    const matches = requirements.map(
      (requirement, ordinal) =>
        byOrdinal.get(ordinal) ??
        heuristicVerdict(requirement, ordinal, candidates[ordinal] ?? []),
    );

    return { ...result, matches };
  } catch (error) {
    console.warn(
      "[jobs] LLM classification failed; using heuristic fallback",
      error,
    );
    return {
      matches: heuristic(),
      model: "heuristic-v1",
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

async function classifyWithLlm(
  requirements: ExtractedRequirement[],
  candidates: RetrievedChunk[][],
): Promise<ClassificationResult> {
  const matches: ClassifiedRequirement[] = [];
  let model = "";
  let inputTokens = 0;
  let outputTokens = 0;

  for (let start = 0; start < requirements.length; start += BATCH_SIZE) {
    const slice = requirements.slice(start, start + BATCH_SIZE);
    const payload = slice.map((requirement, index) => {
      const ordinal = start + index;
      return {
        ordinal,
        text: requirement.text,
        type: requirement.type,
        importance: requirement.importance,
        passages: (candidates[ordinal] ?? [])
          .slice(0, MAX_PASSAGES)
          .map((chunk) => ({
            id: chunk.id,
            section: chunk.section,
            text: clampText(chunk.content, 500),
          })),
      };
    });

    const result = await chatJson({
      system: SYSTEM_PROMPT,
      user: `Requirements and candidate passages:\n${JSON.stringify({
        requirements: payload,
      })}`,
      schema: llmSchema,
      maxTokens: 1400,
    });

    model = result.model;
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;

    const candidateMap = new Map(
      (candidates.flat() as RetrievedChunk[]).map((chunk) => [chunk.id, chunk]),
    );

    for (const item of result.data.results) {
      if (item.ordinal < start || item.ordinal >= start + slice.length) continue;

      const requirement = requirements[item.ordinal];
      if (!requirement) continue;

      const passageIds = new Set(
        (candidates[item.ordinal] ?? []).map((chunk) => chunk.id),
      );
      const validIds = item.evidenceChunkIds.filter((id) => passageIds.has(id));

      const evidence: Evidence[] = validIds
        .map((id) => candidateMap.get(id))
        .filter((chunk): chunk is RetrievedChunk => Boolean(chunk))
        .slice(0, 2)
        .map((chunk) => ({
          chunkId: chunk.id,
          section: chunk.section,
          snippet: clampText(chunk.content, 240),
          similarity: clampSimilarity(chunk.similarity),
        }));

      let verdict: VerdictValue = item.verdict;
      let rationale = item.rationale.trim();

      if (verdict !== "MISSING" && evidence.length === 0) {
        verdict = "MISSING";
        rationale =
          "The model cited no retrievable CV passage, so this was treated as unsupported.";
      }

      if (!rationale) {
        rationale =
          verdict === "MISSING"
            ? "No CV passage supports this requirement."
            : `Supported by your ${evidence[0]?.section ?? "CV"} evidence.`;
      }

      matches.push({
        ...requirement,
        ordinal: item.ordinal,
        verdict,
        rationale: clampText(rationale, 400),
        evidence,
        weight: IMPORTANCE_WEIGHT[requirement.importance],
      });
    }
  }

  return { matches, model, inputTokens, outputTokens };
}

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

const GENERIC_TERMS = new Set([
  "excellent",
  "strong",
  "understanding",
  "knowledge",
  "familiarity",
  "ability",
  "proven",
  "relevant",
  "similar",
  "equivalent",
  "practical",
  "professional",
  "level",
  "skill",
  "skills",
]);

function heuristicVerdict(
  requirement: ExtractedRequirement,
  ordinal: number,
  candidates: RetrievedChunk[],
): ClassifiedRequirement {
  const rawTerms = keywords(requirement.text);
  const requirementTerms = [
    ...new Set(rawTerms.map(canonicalTerm).filter(Boolean)),
  ];
  const displayTerm = new Map<string, string>();
  for (const term of rawTerms) {
    const canonical = canonicalTerm(term);
    if (canonical) displayTerm.set(canonical, term);
  }

  const scored = candidates
    .map((chunk) => {
      const chunkTerms = new Set(
        keywords(chunk.content).map(canonicalTerm).filter(Boolean),
      );
      const matchedCanonical = requirementTerms.filter((term) =>
        chunkTerms.has(term),
      );
      const matchedTerms = matchedCanonical.map(
        (term) => displayTerm.get(term) ?? term,
      );
      const coverage =
        requirementTerms.length === 0
          ? 0
          : matchedCanonical.length / requirementTerms.length;

      return {
        chunk,
        matchedTerms,
        coverage,
        similarity: clampSimilarity(chunk.similarity),
        combined: coverage * 0.72 + clampSimilarity(chunk.similarity) * 0.28,
      };
    })
    .sort((a, b) => b.combined - a.combined);

  const best = scored[0];
  const bestCoverage = best?.coverage ?? 0;
  const bestSimilarity = best?.similarity ?? 0;

  let verdict: VerdictValue = "MISSING";
  if (
    bestCoverage >= 0.55 ||
    (bestCoverage >= 0.35 && bestSimilarity >= 0.5)
  ) {
    verdict = "MATCHED";
  } else if (bestCoverage >= 0.22 || bestSimilarity >= 0.35) {
    verdict = "PARTIAL";
  }

  const evidential = scored
    .filter((item) => item.coverage >= 0.22)
    .slice(0, 2);

  // Every non-missing verdict must point at a real passage.
  if (verdict !== "MISSING" && evidential.length === 0) {
    verdict = "MISSING";
  }

  const evidence: Evidence[] =
    verdict === "MISSING"
      ? []
      : evidential.map((item) => ({
          chunkId: item.chunk.id,
          section: item.chunk.section,
          snippet: buildSnippet(item.chunk.content, item.matchedTerms),
          similarity: Math.round(item.similarity * 100) / 100,
        }));

  return {
    ...requirement,
    ordinal,
    verdict,
    rationale: buildRationale(verdict, requirementTerms, scored, evidential),
    evidence,
    weight: IMPORTANCE_WEIGHT[requirement.importance],
  };
}

function buildRationale(
  verdict: VerdictValue,
  requirementTerms: string[],
  scored: Array<{ chunk: RetrievedChunk; matchedTerms: string[]; coverage: number }>,
  evidential: Array<{
    chunk: RetrievedChunk;
    matchedTerms: string[];
    coverage: number;
  }>,
) {
  const sections = [
    ...new Set(evidential.map((item) => item.chunk.section)),
  ].slice(0, 2);
  const terms = [
    ...new Set(evidential.flatMap((item) => item.matchedTerms)),
  ].slice(0, 5);

  if (verdict === "MATCHED") {
    return `Direct evidence in your ${sections.join(" and ")} section for ${terms.join(", ")}.`;
  }

  if (verdict === "PARTIAL") {
    return `Partial overlap (${Math.round(
      (scored[0]?.coverage ?? 0) * 100,
    )}% of key terms) in your ${sections.join(" and ")} section: ${terms.join(", ")}.`;
  }

  if (requirementTerms.length === 0) {
    return "This requirement has no comparable keywords in your CV.";
  }

  return `No CV passage mentions ${requirementTerms.slice(0, 5).join(", ")}.`;
}

function buildSnippet(content: string, terms: string[]) {
  const lower = content.toLowerCase();
  let index = -1;

  for (const term of terms) {
    const found = lower.indexOf(term.toLowerCase());
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }

  if (index === -1) return clampText(content, 240);

  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, start + 260);

  return `${start > 0 ? "…" : ""}${content
    .slice(start, end)
    .trim()}${end < content.length ? "…" : ""}`;
}

/**
 * Light stemming plus a few domain synonyms, used only for verdict matching.
 * Embeddings keep the raw tokenizer so existing vectors stay valid.
 */
function canonicalTerm(term: string) {
  if (GENERIC_TERMS.has(term)) return "";
  if (term.startsWith("accessib") || term === "a11y") return "access";
  if (term.startsWith("communicat")) return "communic";
  if (term.startsWith("manag")) return "manag";
  if (term.startsWith("stakeholder")) return "stakehold";
  if (term.startsWith("collaborat")) return "collabor";
  if (term.startsWith("organis") || term.startsWith("organiz")) return "organis";
  if (term.startsWith("certif")) return "certif";

  if (
    ["degree", "bsc", "bachelor", "bachelors", "msc", "master", "masters", "mba", "phd", "doctorate"].includes(
      term,
    )
  ) {
    return "degree";
  }
  if (term === "university" || term === "college") return "university";

  if (term.length > 4 && term.endsWith("ies")) {
    return `${term.slice(0, -3)}y`;
  }
  if (term.length > 5 && term.endsWith("ing")) return term.slice(0, -3);
  if (term.length > 4 && term.endsWith("ed")) return term.slice(0, -2);
  if (term.length > 4 && term.endsWith("es")) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s")) return term.slice(0, -1);
  return term;
}

export function assertCandidates(candidates: RetrievedChunk[][]) {
  if (candidates.some((list) => list.length === 0)) {
    throw new AnalysisError(
      422,
      "This CV has no indexed passages to compare against. Re-upload it and try again.",
    );
  }
}
