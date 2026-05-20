import OpenAI from "openai";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  cached = new OpenAI({
    apiKey,
    timeout: 30_000, // 30s — cut off stuck requests
    maxRetries: 1, // single retry on transient errors
  });
  return cached;
}
