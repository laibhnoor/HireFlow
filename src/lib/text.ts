/**
 * Shared text helpers. The tokenizer is intentionally the single source of
 * truth for both mock embeddings and heuristic matching, so offline retrieval
 * and verdicts stay consistent with each other.
 */

export const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","been","but","by","can","did","do","does",
  "for","from","had","has","have","he","her","his","how","i","if","in","into",
  "is","it","its","me","my","no","not","of","on","or","our","out","she","so",
  "that","the","their","them","then","there","these","they","this","to","up",
  "was","we","were","what","when","where","which","who","will","with","you",
  "your",
]);

export function tokenize(text: string) {
  const matches = text.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]*/g) ?? [];
  const counts = new Map<string, number>();
  for (const token of matches) {
    if (token.length < 2 || STOPWORDS.has(token)) continue;
    counts.set(token, Math.min(3, (counts.get(token) ?? 0) + 1));
  }
  return counts;
}

/** Unique meaningful terms in a string, preserving first-seen order. */
export function keywords(text: string): string[] {
  return [...tokenize(text).keys()];
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function clampText(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}
