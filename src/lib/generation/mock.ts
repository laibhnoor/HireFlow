import {
  HORIZON_LABELS,
  INTERVIEW_FOCUS_LABELS,
  LENGTH_LABELS,
  TONE_LABELS,
  type MaterialContext,
  type MaterialOptions,
  type MaterialRequirement,
} from "@/lib/generation/types";

/**
 * Deterministic document generation used when no OpenAI key is configured.
 * It only reuses matched/partial evidence from the stored analysis, so demo
 * output never invents experience.
 */
export function generateMockMaterial(
  context: MaterialContext,
  options: MaterialOptions,
) {
  switch (options.type) {
    case "COVER_LETTER":
      return mockCoverLetter(context, options);
    case "CV_SUGGESTIONS":
      return mockCvSuggestions(context, options);
    case "ROADMAP":
      return mockRoadmap(context, options);
    case "INTERVIEW_PREP":
      return mockInterviewPrep(context, options);
  }
}

function mockCoverLetter(
  context: MaterialContext,
  options: MaterialOptions,
) {
  const matched = context.requirements.filter(
    (requirement) =>
      requirement.verdict === "MATCHED" && requirement.evidence.length > 0,
  );
  const partial = context.requirements.filter(
    (requirement) =>
      requirement.verdict === "PARTIAL" && requirement.evidence.length > 0,
  );

  const topRequirements = [...context.requirements]
    .filter((requirement) => requirement.verdict !== "MISSING")
    .sort(byImportance)
    .slice(0, 3);

  const paragraphs: string[] = [];
  const location = context.job.location
    ? ` in ${context.job.location}`
    : "";

  paragraphs.push(
    `I'm applying for the ${context.job.title} role at ${context.job.company}${location}. ${scoreSentence(
      context.analysis.overallScore,
    )}`,
  );

  if (options.tone === "enthusiastic") {
    paragraphs.push(
      `I'm genuinely excited by the opportunity to bring my experience to ${context.job.company}, and I'd welcome the chance to show how it maps to the role.`,
    );
  }

  if (topRequirements.length > 0) {
    const requirementList = joinNatural(
      topRequirements.map((requirement) => lowerFirst(requirement.text)),
    );
    const evidence = matched
      .slice(0, options.length === "short" ? 1 : 2)
      .map(evidenceSentence);
    paragraphs.push(
      `The role calls for ${requirementList}.${
        evidence.length > 0 ? ` ${evidence.join(" ")}` : ""
      }`,
    );
  }

  if (
    options.length === "standard" &&
    options.tone !== "concise" &&
    partial.length > 0
  ) {
    const sections = uniqueSections(partial).slice(0, 2);
    paragraphs.push(
      `I also have adjacent ${sections.join(" and ")} experience relevant to ${joinNatural(
        partial.slice(0, 2).map((requirement) => lowerFirst(requirement.text)),
      )}, and I'd be glad to discuss how that transfers.`,
    );
  }

  if (options.note.trim()) {
    paragraphs.push(`I'd also like to add: ${options.note.trim()}`);
  }

  paragraphs.push(
    `I'd welcome the chance to discuss how my experience could contribute to ${context.job.company}. Thank you for your time and consideration.`,
  );

  return `Dear Hiring Team,

${paragraphs.join("\n\n")}

Sincerely,
${context.candidateName}`;
}

function mockCvSuggestions(
  context: MaterialContext,
  options: MaterialOptions,
) {
  const gaps = context.requirements
    .filter((requirement) => requirement.verdict !== "MATCHED")
    .sort(byPriority);
  const matched = context.requirements.filter(
    (requirement) => requirement.verdict === "MATCHED",
  );

  const lines: string[] = ["# CV improvement suggestions", ""];
  lines.push(
    `Tailored to **${context.job.title}** at **${context.job.company}** using rubric v${context.analysis.rubricVersion} and ${LENGTH_LABELS[options.length].toLowerCase()} guidance with a ${TONE_LABELS[options.tone].toLowerCase()} tone.`,
  );
  lines.push("");

  lines.push("## Top priorities");
  if (gaps.length === 0) {
    lines.push(
      "1. **No material gaps found** — keep the current evidence and tailor the summary to the role.",
    );
  } else {
    gaps.slice(0, 3).forEach((requirement, index) => {
      lines.push(
        `${index + 1}. **${requirement.text}** — ${priorityReason(requirement)}.`,
      );
    });
  }
  lines.push("");

  lines.push("## Requirement-by-requirement");
  if (gaps.length === 0) {
    lines.push(
      "Every extracted requirement already has supporting evidence in your CV. No edits are required beyond normal tailoring.",
    );
  } else {
    for (const requirement of gaps) {
      lines.push(
        `### ${requirement.verdict === "MISSING" ? "Missing" : "Partial"} · ${labelImportance(
          requirement.importance,
        )}: ${requirement.text}`,
      );
      lines.push(`**What we found:** ${whatWeFound(requirement)}`);
      lines.push("");
      lines.push(`**Suggested action:** ${suggestedAction(requirement)}`);
      lines.push("");
      lines.push(`**Draft bullet (verify before using):** ${draftBullet(requirement)}`);
      lines.push("");
    }
  }

  lines.push("## Strengths to keep");
  if (matched.length === 0) {
    lines.push("- No requirements are fully matched yet. Focus on the gaps above.");
  } else {
    for (const requirement of matched.slice(0, 8)) {
      lines.push(`- ${requirement.text}`);
    }
  }

  return lines.join("\n");
}

function mockRoadmap(context: MaterialContext, options: MaterialOptions) {
  const gaps = context.requirements
    .filter((requirement) => requirement.verdict !== "MATCHED")
    .sort(byPriority);
  const matched = context.requirements.filter(
    (requirement) => requirement.verdict === "MATCHED",
  );

  const missingMust = gaps.filter(
    (requirement) =>
      requirement.verdict === "MISSING" &&
      requirement.importance === "MUST_HAVE",
  );
  const partialMust = gaps.filter(
    (requirement) =>
      requirement.verdict === "PARTIAL" &&
      requirement.importance === "MUST_HAVE",
  );
  const remaining = gaps.filter(
    (requirement) => !missingMust.includes(requirement) && !partialMust.includes(requirement),
  );

  const isShort = options.horizon === "4_weeks";
  const phaseOne = missingMust.slice(0, isShort ? 3 : 4);
  const phaseTwo = partialMust.slice(0, isShort ? 3 : 4);
  const phaseThree = isShort ? [] : remaining.slice(0, 5);

  const lines: string[] = ["# Skill-gap roadmap", ""];
  lines.push(
    `Tailored to **${context.job.title}** at **${context.job.company}** over ${HORIZON_LABELS[
      options.horizon
    ].toLowerCase()}, using rubric v${context.analysis.rubricVersion}.`,
  );
  lines.push("");

  lines.push("## Goal");
  if (gaps.length === 0) {
    lines.push(
      "No material gaps found. Keep the evidence current and rehearse the stories behind it.",
    );
  } else {
    lines.push(
      `Close ${gaps.length} gap${gaps.length === 1 ? "" : "s"}, starting with **${
        gaps[0].text
      }**, so every must-have has evidence you can point to.`,
    );
  }
  lines.push("");

  if (phaseOne.length > 0) {
    lines.push(
      `## Phase 1 — Build the missing must-haves (weeks 1-${isShort ? 2 : 3})`,
    );
    appendRoadmapSteps(lines, phaseOne);
  }

  if (phaseTwo.length > 0) {
    lines.push(
      `## Phase 2 — Strengthen adjacent evidence (weeks ${
        isShort ? "3-4" : "4-8"
      })`,
    );
    appendRoadmapSteps(lines, phaseTwo);
  }

  if (phaseThree.length > 0) {
    lines.push("## Phase 3 — Deepen and differentiate (weeks 9-12)");
    appendRoadmapSteps(lines, phaseThree);
  }

  if (phaseOne.length === 0 && phaseTwo.length === 0 && phaseThree.length === 0) {
    lines.push("## Keep doing");
    lines.push(
      "- Every extracted requirement already has evidence. Refresh examples and outcomes before the interview.",
    );
  } else if (matched.length > 0) {
    lines.push("## Keep doing");
    for (const requirement of matched.slice(0, 8)) {
      lines.push(
        `- **${requirement.text}** — already matched; keep the cited passage and its outcome ready to discuss.`,
      );
    }
  }

  return lines.join("\n");
}

function appendRoadmapSteps(
  lines: string[],
  requirements: MaterialRequirement[],
) {
  for (const requirement of requirements) {
    const step = roadmapStep(requirement);
    lines.push(`### ${requirement.text}`);
    lines.push(`**Why it matters:** ${whyItMatters(requirement)}`);
    lines.push("");
    lines.push(`**Do this:** ${step.doThis}`);
    lines.push("");
    lines.push(`**Evidence to produce:** ${step.evidence}`);
    lines.push("");
    lines.push(`**Done when:** ${step.doneWhen}`);
    lines.push("");
  }
}

function roadmapStep(requirement: MaterialRequirement) {
  if (requirement.verdict === "MISSING") {
    return {
      doThis: `Start small and real: ${lowerFirst(buildActionFor(requirement))}`,
      evidence: `A dated artefact you can show: ${evidenceArtefact(
        requirement,
      )}, plus two sentences on the decisions you made.`,
      doneWhen: `You can walk an interviewer through the artefact and explain what you would change next.`,
    };
  }

  const evidence = requirement.evidence[0];
  const section = evidence?.section || "CV";
  const snippet = cleanSnippet(evidence?.snippet ?? "");

  return {
    doThis: `Strengthen the existing ${section} entry. ${buildActionFor(
      requirement,
    )}`,
    evidence: snippet
      ? `An updated ${section} bullet based on: “${snippet}” that adds the missing scope or keyword.`
      : `An updated ${section} bullet that makes ${lowerFirst(
          requirement.text,
        )} explicit using only work you can prove.`,
    doneWhen: `The ${section} entry names ${lowerFirst(
      requirement.text,
    )} and the scope you personally owned.`,
  };
}

/**
 * More specific than the generic type-based action: a communication gap needs a
 * real review or write-up, not another side project.
 */
function buildActionFor(requirement: MaterialRequirement) {
  const text = requirement.text.toLowerCase();

  if (/(communicat|stakeholder|collaborat|influence|presentation)/.test(text)) {
    return "run a short written update or review with real stakeholders, then record the decision and outcome.";
  }
  if (/(mentor|lead|manage|coach)/.test(text)) {
    return "take ownership of a small piece of work with other people, then document how you set direction and gave feedback.";
  }
  if (/(accessib|wcag|a11y|semantic html)/.test(text)) {
    return "audit one real interface against the standard, fix the top issues and write up the before and after.";
  }
  if (/(test|playwright|cypress)/.test(text)) {
    return "add an end-to-end test suite to a real project and document the coverage and the failures it caught.";
  }
  if (/(performance|profil|core web vital)/.test(text)) {
    return "profile a real page, fix one bottleneck and record the before and after metrics.";
  }
  if (/(open-source|portfolio)/.test(text)) {
    return "ship a public, documented contribution or case study that shows the work end to end.";
  }

  return buildAction(requirement.type);
}

function evidenceArtefact(requirement: MaterialRequirement) {
  const text = requirement.text.toLowerCase();

  if (/(communicat|stakeholder|collaborat|influence)/.test(text)) {
    return "a decision record, review write-up or presentation you actually delivered";
  }
  if (/(accessib|wcag|a11y|semantic html)/.test(text)) {
    return "an accessibility audit with before and after fixes";
  }
  if (/(test|playwright|cypress)/.test(text)) {
    return "a test suite with a short note on the bugs it caught";
  }
  if (/(performance|profil|core web vital)/.test(text)) {
    return "a before and after profile of a real page";
  }
  if (/(open-source|portfolio)/.test(text)) {
    return "a public repository or case study with the work and your contribution";
  }

  switch (requirement.type) {
    case "SKILL":
      return "a repository or demo that uses the skill in a real workflow";
    case "EXPERIENCE":
      return "a project entry with the scope, your ownership and the outcome";
    case "PROJECT":
      return "a project write-up with the problem, stack and result";
    case "EDUCATION":
    case "CERTIFICATION":
      return "the qualification or certificate, if you hold it";
    default:
      return "a concrete write-up of the work and its outcome";
  }
}

function whyItMatters(requirement: MaterialRequirement) {
  const level =
    requirement.importance === "MUST_HAVE" ? "a must-have" : "a nice-to-have";
  if (requirement.verdict === "MISSING") {
    return `${capitalise(level)} in this role with no supporting CV evidence, so it is the highest-risk gap.`;
  }
  return `${capitalise(level)} with adjacent evidence only; one specific detail would make it convincing.`;
}

function mockInterviewPrep(
  context: MaterialContext,
  options: MaterialOptions,
) {
  const focused = focusRequirements(context.requirements, options);
  const questions = focused
    .slice()
    .sort(byInterviewPriority)
    .slice(0, 8);
  const missing = context.requirements
    .filter((requirement) => requirement.verdict === "MISSING")
    .sort(byPriority);
  const matched = context.requirements.filter(
    (requirement) => requirement.verdict === "MATCHED",
  );

  const lines: string[] = ["# Interview preparation", ""];
  lines.push(
    `Tailored to **${context.job.title}** at **${context.job.company}** with a ${INTERVIEW_FOCUS_LABELS[
      options.interviewFocus
    ].toLowerCase()} focus.`,
  );
  lines.push("");

  lines.push("## How to use this");
  lines.push(
    "Rehearse each answer out loud, keep every claim tied to the cited evidence, and use the gap scripts where no evidence exists yet.",
  );
  lines.push("");

  lines.push("## Likely questions");
  if (questions.length === 0) {
    lines.push(
      "No requirements were extracted for this role. Prepare examples around the job description's main themes.",
    );
  } else {
    for (const requirement of questions) {
      lines.push(
        `### ${interviewCategory(requirement)} · ${capitalise(
          labelImportance(requirement.importance),
        )}: ${requirement.text}`,
      );
      lines.push(`**Question:** ${interviewQuestion(requirement)}`);
      lines.push("");
      lines.push(`**Why they ask:** ${interviewWhy(requirement)}`);
      lines.push("");
      lines.push("**Answer outline (STAR):**");
      for (const bullet of starOutline(requirement)) {
        lines.push(`- ${bullet}`);
      }
      lines.push("");
      lines.push(`**Evidence to cite:** ${evidenceToCite(requirement)}`);
      lines.push("");
      lines.push(`**Follow-up to expect:** ${followUp(requirement)}`);
      lines.push("");
    }
  }

  lines.push("## Honest gap scripts");
  if (missing.length === 0) {
    lines.push(
      "No missing requirements. Keep every answer anchored in the evidence listed above.",
    );
  } else {
    for (const requirement of missing.slice(0, 5)) {
      lines.push(`### ${requirement.text}`);
      lines.push(
        `**Say:** “I don't yet have direct professional experience with ${lowerFirst(
          requirement.text,
        )}. I'm closing that gap by ${lowerFirst(buildActionFor(requirement))}”`,
      );
      lines.push("");
      lines.push(
        "**Then show:** the artefact or plan you are building, and be explicit about what is not finished yet.",
      );
      lines.push("");
    }
  }

  lines.push("## Questions to ask them");
  lines.push(
    "- What does success look like in the first three months, and how will you measure it?",
  );
  lines.push(
    "- Which requirement is hardest to hire for, and how does the team support someone growing into it?",
  );
  lines.push(
    "- How does the team review work, share feedback and make technical decisions?",
  );
  if (missing.length > 0) {
    lines.push(
      `- How is ${lowerFirst(missing[0].text)} used day to day on the team?`,
    );
  }
  if (matched.length > 0) {
    lines.push(
      `- Where would ${lowerFirst(matched[0].text)} have the biggest impact in the first quarter?`,
    );
  }

  return lines.join("\n");
}

function focusRequirements(
  requirements: MaterialRequirement[],
  options: MaterialOptions,
) {
  if (options.interviewFocus === "technical") {
    const technical = requirements.filter((requirement) =>
      ["SKILL", "PROJECT", "CERTIFICATION"].includes(requirement.type),
    );
    return technical.length >= 3 ? technical : requirements;
  }

  if (options.interviewFocus === "behavioural") {
    const behavioural = requirements.filter((requirement) =>
      ["EXPERIENCE", "EDUCATION", "OTHER"].includes(requirement.type),
    );
    return behavioural.length >= 3 ? behavioural : requirements;
  }

  return requirements;
}

function byInterviewPriority(a: MaterialRequirement, b: MaterialRequirement) {
  const verdictScore = (requirement: MaterialRequirement) =>
    requirement.verdict === "MATCHED"
      ? 2
      : requirement.verdict === "PARTIAL"
        ? 1
        : 0;
  const importanceScore = (requirement: MaterialRequirement) =>
    requirement.importance === "MUST_HAVE" ? 1 : 0;

  return (
    verdictScore(b) - verdictScore(a) ||
    importanceScore(b) - importanceScore(a) ||
    a.ordinal - b.ordinal
  );
}

function interviewCategory(requirement: MaterialRequirement) {
  switch (requirement.type) {
    case "SKILL":
      return "Technical";
    case "PROJECT":
      return "Project";
    case "EXPERIENCE":
      return "Behavioural";
    case "EDUCATION":
    case "CERTIFICATION":
      return "Background";
    default:
      return "Role-specific";
  }
}

function interviewQuestion(requirement: MaterialRequirement) {
  const topic = lowerFirst(requirement.text);
  switch (requirement.type) {
    case "SKILL":
      return `Which piece of work best demonstrates ${topic}?`;
    case "EXPERIENCE":
      return `Which example best proves this requirement: ${topic}?`;
    case "PROJECT":
      return `Which project best shows ${topic}, and what was your personal contribution?`;
    case "EDUCATION":
    case "CERTIFICATION":
      return `What in your background covers ${topic}?`;
    default:
      return `How would you approach ${topic} in this role?`;
  }
}

function interviewWhy(requirement: MaterialRequirement) {
  return requirement.importance === "MUST_HAVE"
    ? "It is a must-have in the job description, so they will look for concrete evidence and follow-up detail."
    : "It is a listed nice-to-have, so a strong answer can differentiate you from other candidates.";
}

function starOutline(requirement: MaterialRequirement) {
  const evidence = requirement.evidence[0];
  const snippet = evidence ? cleanSnippet(evidence.snippet) : "";
  const section = evidence?.section || "CV";

  if (requirement.verdict === "MISSING" || !evidence) {
    return [
      "**Situation:** No evidence yet — do not invent one; use the honest gap script below.",
      "**Task:** Name the closest real problem you have solved and why it is adjacent.",
      "**Action:** Describe the action you would take first in this role.",
      "**Result:** State what you are building to close the gap and when it will be ready.",
    ];
  }

  return [
    snippet
      ? `**Situation:** Pick the moment behind your ${section} evidence: “${snippet}”.`
      : `**Situation:** Pick the moment behind your ${section} evidence and describe the goal.`,
    "**Task:** Explain the goal, constraints and what was at stake.",
    "**Action:** Describe what you personally did, the decisions you made and the trade-offs.",
    "**Result:** Give the outcome and the metric you can verify; do not estimate numbers you do not know.",
  ];
}

function evidenceToCite(requirement: MaterialRequirement) {
  const evidence = requirement.evidence[0];
  if (!evidence) {
    return "No evidence yet — use the honest gap script instead of claiming the requirement.";
  }
  const snippet = cleanSnippet(evidence.snippet);
  return snippet
    ? `Your ${evidence.section} passage: “${snippet}”.`
    : `Your ${evidence.section} passage — quote the specific bullet, scope and outcome.`;
}

function followUp(requirement: MaterialRequirement) {
  if (requirement.verdict === "MISSING") {
    return "What have you done so far to close this gap, and how would you know you are ready?";
  }
  if (requirement.verdict === "PARTIAL") {
    return "Which part of this did you own end to end, and what would you do differently next time?";
  }
  return "What was the hardest trade-off, and how did you measure success?";
}

function cleanSnippet(value: string) {
  const full = value
    .replace(/^[…\s]+/, "")
    .replace(/[…\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Phase 3 snippets can start mid-word when they are clipped. Never quote a
  // broken fragment in a generated document.
  if (!full || /^[a-z]/.test(full)) return "";

  const clipped = full.slice(0, 180).trim();
  return clipped.length < full.length ? `${clipped}…` : clipped;
}

function capitalise(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function scoreSentence(score: number) {
  if (score >= 80) {
    return "Your requirements line up closely with the work I have been doing.";
  }
  if (score >= 60) {
    return "My background maps well to the role, with a few areas I would be glad to discuss.";
  }
  if (score >= 40) {
    return "My background covers part of the role, and I would welcome the chance to discuss the areas where I can grow quickly.";
  }
  return "I am keen to discuss how my background could contribute and where I can build the remaining evidence.";
}

function evidenceSentence(requirement: MaterialRequirement) {
  const evidence = requirement.evidence[0];
  const section = evidence?.section?.toLowerCase() || "cv";
  return `In my ${section}, I cover ${lowerFirst(requirement.text)}.`;
}

function priorityReason(requirement: MaterialRequirement) {
  if (requirement.verdict === "MISSING") {
    return "no CV evidence found, so do not claim it until you have proof";
  }
  return "adjacent evidence only, so make the missing detail explicit";
}

function whatWeFound(requirement: MaterialRequirement) {
  if (requirement.verdict === "MISSING") {
    return "No CV passage supports this requirement.";
  }

  const evidence = requirement.evidence[0];
  const rationale = requirement.rationale.trim();
  const section = evidence?.section ? `your ${evidence.section} section` : "your CV";

  if (rationale) return rationale;
  return `Adjacent evidence was found in ${section}, but it does not fully cover the requirement.`;
}

function suggestedAction(requirement: MaterialRequirement) {
  const isMissing = requirement.verdict === "MISSING";

  if (isMissing) {
    return `If you have this experience, add a specific bullet naming the tool, scope and outcome. If not, do not claim it — build the evidence first: ${buildAction(
      requirement.type,
    )}`;
  }

  const section = requirement.evidence[0]?.section || "CV";
  return `Strengthen the existing ${section} evidence by adding the missing scope or keyword, only where it is true. ${buildAction(
    requirement.type,
  )}`;
}

function buildAction(type: string) {
  switch (type) {
    case "SKILL":
      return "Ship a small project or contribute to an existing one, then describe the tool and result.";
    case "EXPERIENCE":
      return "Surface ownership, team size, duration and outcomes from work you already did.";
    case "EDUCATION":
      return "Add the qualification if you hold it; otherwise address it honestly in your cover letter.";
    case "PROJECT":
      return "Add a project entry with the problem, stack and a measurable result.";
    case "CERTIFICATION":
      return "Add the certification and year if valid; otherwise plan to earn it.";
    default:
      return "Add one concrete example that demonstrates the requirement.";
  }
}

function draftBullet(requirement: MaterialRequirement) {
  if (requirement.verdict === "MISSING") {
    return "No draft bullet — earn this first.";
  }

  const evidence = requirement.evidence[0];
  if (!evidence) {
    return "No draft bullet — add real evidence first.";
  }

  const snippet = evidence.snippet
    .replace(/^[…\s]+/, "")
    .replace(/[…\s]+$/, "")
    .replace(/\s+/g, " ")
    .slice(0, 180)
    .trim();

  // Phase 3 snippets can start mid-word when they are clipped. Fall back to an
  // instruction rather than quoting a broken fragment.
  if (!snippet || /^[a-z]/.test(snippet)) {
    return `Draft from your ${evidence.section} section: add a bullet that explicitly names ${lowerFirst(
      requirement.text,
    )}, using only the scope you can prove.`;
  }

  return `“${snippet}” — make sure the bullet explicitly names ${lowerFirst(
    requirement.text,
  )}.`;
}

function byImportance(a: MaterialRequirement, b: MaterialRequirement) {
  const importance =
    (a.importance === "MUST_HAVE" ? 1 : 0) -
    (b.importance === "MUST_HAVE" ? 1 : 0);
  return importance !== 0 ? -importance : a.ordinal - b.ordinal;
}

function byPriority(a: MaterialRequirement, b: MaterialRequirement) {
  const score = (requirement: MaterialRequirement) => {
    const missing = requirement.verdict === "MISSING" ? 2 : 1;
    const must = requirement.importance === "MUST_HAVE" ? 2 : 1;
    return missing * 10 + must * 3 + requirement.weight;
  };

  return score(b) - score(a) || a.ordinal - b.ordinal;
}

function labelImportance(importance: string) {
  return importance === "MUST_HAVE" ? "Must-have" : "Nice-to-have";
}

function uniqueSections(requirements: MaterialRequirement[]) {
  return [
    ...new Set(
      requirements
        .map((requirement) => requirement.evidence[0]?.section)
        .filter((section): section is string => Boolean(section)),
    ),
  ];
}

function lowerFirst(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed[0].toLowerCase()}${trimmed.slice(1)}`;
}

function joinNatural(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}
