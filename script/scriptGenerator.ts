/**
 * script/scriptGenerator.ts
 * The "Script" step: turns Research + Hook into a scene-based script.
 * Scene count and total length are decided by the model based on the
 * topic's richness -- there's no fixed target duration.
 */

import { askGroqJSON } from "../utils/groqClient.js";
import { buildScriptPrompt } from "../prompts/script.prompt.js";
import type { Research } from "../content/research.js";
import type { Hook } from "../content/hook.js";
import type { Script, Scene } from "./types.js";

interface RawScene {
  durationSec: number;
  narration: string;
  imagePrompt: string;
}

function validateScenes(raw: unknown): RawScene[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Script Generator: model returned no scenes.");
  }
  for (const s of raw) {
    if (
      typeof s.durationSec !== "number" ||
      typeof s.narration !== "string" ||
      typeof s.imagePrompt !== "string"
    ) {
      throw new Error(
        `Script Generator: malformed scene in model output: ${JSON.stringify(s)}`
      );
    }
  }
  return raw as RawScene[];
}

export async function generateScript(
  research: Research,
  hook: Hook
): Promise<Script> {
  const data = await askGroqJSON<{ scenes: RawScene[] }>(
    buildScriptPrompt(research.topic, research.angle, research.keyFacts, hook.text)
  );
  const rawScenes = validateScenes(data.scenes);

  const scenes: Scene[] = rawScenes.map((s, i) => ({
    id: i + 1,
    durationSec: s.durationSec,
    narration: s.narration,
    imagePrompt: s.imagePrompt,
  }));

  return {
    topic: research.topic,
    scenes,
    totalDurationSec: scenes.reduce((sum, s) => sum + s.durationSec, 0),
    fullNarration: scenes.map((s) => s.narration).join(" "),
  };
}
