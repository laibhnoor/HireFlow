import OpenAI from "openai";

import { env } from "@/lib/env";

export const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 64;

export type EmbeddingResult = {
  vectors: number[][];
  model: string;
  inputTokens: number;
  mocked: boolean;
};

let client: OpenAI | null = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
      timeout: 60_000,
      maxRetries: 2,
    });
  }
  return client;
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
  if (texts.length === 0) {
    return { vectors: [], model: "none", inputTokens: 0, mocked: true };
  }

  if (env.llmMockMode) {
    return {
      vectors: texts.map(mockEmbedding),
      model: "mock-hashing-v1",
      inputTokens: texts.reduce(
        (total, text) => total + Math.ceil(text.length / 4),
        0,
      ),
      mocked: true,
    };
  }

  const vectors: number[][] = [];
  let inputTokens = 0;

  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const batch = texts.slice(offset, offset + BATCH_SIZE);
    const response = await getClient().embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: batch,
      encoding_format: "float",
    });

    inputTokens += response.usage?.prompt_tokens ?? 0;

    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    for (const item of ordered) {
      if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding model "${env.OPENAI_EMBEDDING_MODEL}" returned ${item.embedding.length} dimensions, expected ${EMBEDDING_DIMENSIONS}. Update the model or the vector column.`,
        );
      }
      vectors.push(item.embedding);
    }
  }

  return {
    vectors,
    model: env.OPENAI_EMBEDDING_MODEL,
    inputTokens,
    mocked: false,
  };
}

export function toVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => value.toFixed(7)).join(",")}]`;
}

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","been","but","by","can","did","do","does",
  "for","from","had","has","have","he","her","his","how","i","if","in","into",
  "is","it","its","me","my","no","not","of","on","or","our","out","she","so",
  "that","the","their","them","then","there","these","they","this","to","up",
  "was","we","were","what","when","where","which","who","will","with","you",
  "your",
]);

function tokenize(text: string) {
  const matches = text.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]*/g) ?? [];
  const counts = new Map<string, number>();
  for (const token of matches) {
    if (token.length < 2 || STOPWORDS.has(token)) continue;
    counts.set(token, Math.min(3, (counts.get(token) ?? 0) + 1));
  }
  return counts;
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic bag-of-words embedding used when no OpenAI key is configured.
 * Shared vocabulary yields shared dimensions, so cosine similarity still ranks
 * related chunks above unrelated ones — enough to exercise retrieval locally.
 */
export function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const counts = tokenize(text);

  if (counts.size === 0) {
    vector[fnv1a(text) % EMBEDDING_DIMENSIONS] = 1;
    return vector;
  }

  for (const [token, count] of counts) {
    const hash = fnv1a(token);
    const index = hash % EMBEDDING_DIMENSIONS;
    const sign = (hash >>> 16) & 1 ? 1 : -1;
    vector[index] += sign * count;
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;

  return vector.map((value) => value / norm);
}
