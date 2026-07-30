/**
 * utils/groqClient.ts
 *
 * Single shared Groq caller for every pipeline step (Idea, Research, Hook,
 * and later Script/Rewrite). Centralizing this means retry/backoff,
 * the markdown-fence-stripping fix, and the model name only exist once.
 */

import { env, requireEnv } from "../config/env.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface GroqOptions {
  temperature?: number;
  retries?: number;
}

/** Calls Groq and returns the raw text content of the reply. */
export async function askGroq(
  prompt: string,
  opts: GroqOptions = {}
): Promise<string> {
  requireEnv(["GROQ_API_KEY"]);
  const { temperature = 0.8, retries = 2 } = opts;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature,
        }),
      });
      if (!res.ok) {
        throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Calls Groq expecting a JSON object back, and robustly strips the
 * ```json ... ``` fences Groq sometimes wraps responses in.
 */
export async function askGroqJSON<T>(
  prompt: string,
  opts: GroqOptions = {}
): Promise<T> {
  const raw = await askGroq(prompt, opts);
  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}
