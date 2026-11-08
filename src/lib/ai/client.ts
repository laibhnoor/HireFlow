import OpenAI from "openai";

import { env } from "@/lib/env";

let client: OpenAI | null = null;

/** Shared OpenAI client so embeddings and chat reuse one connection pool. */
export function getOpenAIClient() {
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
