import type { z } from "zod";

import { getOpenAIClient } from "@/lib/ai/client";
import { env } from "@/lib/env";

export type ChatJsonResult<T> = {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * One JSON-mode chat completion validated by a Zod schema. Callers are expected
 * to catch failures and fall back to deterministic behaviour so a bad model
 * response can never break an analysis.
 */
export async function chatJson<S extends z.ZodType>({
  system,
  user,
  schema,
  maxTokens = 1600,
  temperature = 0.1,
}: {
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  temperature?: number;
}): Promise<ChatJsonResult<z.output<S>>> {
  if (env.llmMockMode) {
    throw new Error("chatJson called without an OpenAI key");
  }

  const response = await getOpenAIClient().chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("The model returned malformed JSON");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `The model returned an unexpected shape: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    );
  }

  return {
    data: parsed.data,
    model: env.OPENAI_CHAT_MODEL,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}
