import { streamChat } from "@/lib/ai/chat";
import { env } from "@/lib/env";
import { generateMockMaterial } from "@/lib/generation/mock";
import {
  MATERIAL_PROMPT_VERSION,
  buildMaterialMessages,
} from "@/lib/generation/prompts";
import type {
  MaterialContext,
  MaterialOptions,
} from "@/lib/generation/types";

export type MaterialGeneration = {
  stream: AsyncGenerator<string>;
  getUsage: () => { inputTokens: number; outputTokens: number };
  model: string;
  promptVersion: string;
};

const MOCK_MODEL = "heuristic-v1";

export async function streamMaterial(
  context: MaterialContext,
  options: MaterialOptions,
  signal?: AbortSignal,
): Promise<MaterialGeneration> {
  const messages = buildMaterialMessages(context, options);

  if (env.llmMockMode) {
    return mockGeneration(context, options, messages.user);
  }

  try {
    const result = await streamChat({
      system: messages.system,
      user: messages.user,
      maxTokens: messages.maxTokens,
      temperature: messages.temperature,
      signal,
    });

    return {
      stream: result.stream,
      getUsage: result.getUsage,
      model: env.OPENAI_CHAT_MODEL,
      promptVersion: MATERIAL_PROMPT_VERSION,
    };
  } catch (error) {
    // A provider outage should not block the user: fall back to the same
    // deterministic, evidence-only output used in demo mode.
    console.warn(
      "[generation] streaming provider failed; using deterministic fallback",
      error,
    );
    return mockGeneration(context, options, messages.user);
  }
}

function mockGeneration(
  context: MaterialContext,
  options: MaterialOptions,
  prompt: string,
): MaterialGeneration {
  const content = generateMockMaterial(context, options);

  return {
    stream: chunkText(content),
    getUsage: () => ({
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(content),
    }),
    model: MOCK_MODEL,
    promptVersion: MATERIAL_PROMPT_VERSION,
  };
}

export async function* chunkText(text: string, size = 36) {
  const pieces = text.match(/\S+\s*/g) ?? [text];
  let buffer = "";

  for (const piece of pieces) {
    buffer += piece;
    if (buffer.length >= size) {
      yield buffer;
      buffer = "";
    }
  }

  if (buffer) yield buffer;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
