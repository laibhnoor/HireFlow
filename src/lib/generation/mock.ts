import {
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
  return options.type === "COVER_LETTER"
    ? mockCoverLetter(context, options)
    : mockCvSuggestions(context, options);
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
