/**
 * content/hook.ts
 * The "Hook" step: one strong opening line, generated separately from
 * the full script so it can be iterated on/A-B tested independently.
 */

import { askGroq } from "../utils/groqClient.js";
import { buildHookPrompt } from "../prompts/hook.prompt.js";
import type { Research } from "./research.js";

export interface Hook {
  text: string;
}

export async function generateHook(research: Research): Promise<Hook> {
  const text = await askGroq(buildHookPrompt(research.topic, research.angle));
  return { text: text.trim() };
}
