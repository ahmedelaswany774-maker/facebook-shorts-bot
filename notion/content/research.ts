/**
 * content/research.ts
 * The "Research" step: turns a bare topic into a narrative angle + key
 * facts that the (Phase 4) Script Generator will build scenes from.
 */

import { askGroqJSON } from "../utils/groqClient.js";
import { buildResearchPrompt } from "../prompts/research.prompt.js";
import type { Idea } from "./ideaSource.js";

export interface Research {
  topic: string;
  angle: string;
  keyFacts: string[];
}

export async function research(idea: Idea): Promise<Research> {
  const data = await askGroqJSON<{ angle: string; keyFacts: string[] }>(
    buildResearchPrompt(idea.topic)
  );
  return { topic: idea.topic, angle: data.angle, keyFacts: data.keyFacts };
}
