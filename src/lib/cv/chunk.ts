import type { CvChunkDraft, CvSection } from "@/lib/cv/types";

const MAX_CHARS = 900;
const OVERLAP_CHARS = 120;
const MIN_CHARS = 60;

export function chunkSections(sections: CvSection[]): CvChunkDraft[] {
  const drafts: CvChunkDraft[] = [];
  let ordinal = 0;

  for (const section of sections) {
    const blocks = splitBlocks(section.content);
    if (blocks.length === 0) continue;

    let current = "";
    let chunksInSection = 0;

    const push = () => {
      const content = current.trim();
      if (content.length === 0) return;
      if (content.length < MIN_CHARS && chunksInSection > 0) return;

      drafts.push({
        ordinal: ordinal++,
        section: section.name,
        content,
        tokenCount: Math.max(1, Math.ceil(content.length / 4)),
      });
      chunksInSection += 1;
    };

    for (const block of blocks) {
      if (current.length === 0) {
        current = block;
        continue;
      }

      if (current.length + block.length + 2 <= MAX_CHARS) {
        current = `${current}\n\n${block}`;
        continue;
      }

      push();
      const tail = overlapTail(current);
      current = tail ? `${tail}\n\n${block}` : block;
    }

    push();
  }

  return drafts;
}

function splitBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => (block.length <= MAX_CHARS ? [block] : splitLong(block)));
}

function splitLong(block: string) {
  const sentences = block.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > MAX_CHARS) {
      if (current) {
        parts.push(current);
        current = "";
      }
      for (let index = 0; index < sentence.length; index += MAX_CHARS) {
        parts.push(sentence.slice(index, index + MAX_CHARS));
      }
      continue;
    }

    if (current.length + sentence.length + 1 <= MAX_CHARS) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      parts.push(current);
      current = sentence;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function overlapTail(value: string) {
  if (value.length <= OVERLAP_CHARS) return value;
  const tail = value.slice(-OVERLAP_CHARS);
  const firstSpace = tail.indexOf(" ");
  return firstSpace === -1 ? "" : tail.slice(firstSpace + 1).trim();
}
