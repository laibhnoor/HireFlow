import type { QuestionCategory } from "@prisma/client";

export type ParsedInterviewQuestion = {
  ordinal: number;
  category: QuestionCategory;
  question: string;
  starHint: string;
  answer: string;
};

/**
 * Extracts the "Likely questions" section from an interview-prep document into
 * structured rows. The document remains the source of truth; this is a durable
 * practice bank that future features can quiz against.
 *
 * The parser is deliberately tolerant of the small format differences between
 * the deterministic writer and an LLM (bold colon inside/outside, extra blank
 * lines, a missing follow-up).
 */
export function parseInterviewQuestions(
  markdown: string,
): ParsedInterviewQuestion[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const questions: ParsedInterviewQuestion[] = [];

  let inSection = false;
  let category: QuestionCategory = "ROLE_SPECIFIC";
  let question = "";
  let star: string[] = [];
  let evidence = "";
  let followUp = "";

  const flush = () => {
    if (!question) {
      star = [];
      evidence = "";
      followUp = "";
      return;
    }

    const hint = [
      ...star,
      evidence ? `**Evidence to cite:** ${evidence}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    questions.push({
      ordinal: questions.length,
      category,
      question,
      starHint: hint,
      answer: followUp ? `**Follow-up to expect:** ${followUp}` : "",
    });

    question = "";
    star = [];
    evidence = "";
    followUp = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^##\s+Likely questions/i.test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && /^##\s+/.test(line)) {
      flush();
      break;
    }

    if (!inSection) continue;

    const heading = /^###\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const label = heading[1].split("·")[0]?.trim() ?? "";
      category = toCategory(label);
      continue;
    }

    const questionValue = fieldValue(line, "Question");
    if (questionValue !== null) {
      question = questionValue;
      continue;
    }

    const evidenceValue = fieldValue(line, "Evidence to cite");
    if (evidenceValue !== null) {
      evidence = evidenceValue;
      continue;
    }

    const followUpValue = fieldValue(line, "Follow-up to expect");
    if (followUpValue !== null) {
      followUp = followUpValue;
      continue;
    }

    const starLine = /^-\s+\*\*(Situation|Task|Action|Result):?\*\*:?\s*(.+)$/i.exec(
      line,
    );
    if (starLine) {
      star.push(`**${capitalise(starLine[1])}:** ${starLine[2].trim()}`);
    }
  }

  flush();

  return questions;
}

function fieldValue(line: string, name: string) {
  const match = new RegExp(
    `^\\*\\*${name}:?\\*\\*:?\\s*(.*)$`,
    "i",
  ).exec(line);
  return match ? match[1].trim() : null;
}

function toCategory(label: string): QuestionCategory {
  const value = label.toLowerCase();

  if (value.includes("technical")) return "TECHNICAL";
  if (value.includes("behavio")) return "BEHAVIORAL";
  if (value.includes("system design")) return "SYSTEM_DESIGN";
  return "ROLE_SPECIFIC";
}

function capitalise(value: string) {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1).toLowerCase()}`;
}
