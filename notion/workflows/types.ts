/**
 * workflows/types.ts
 * The context object threaded through the whole AI Pipeline. Each phase
 * adds its own field once implemented -- later phases (4-10) fields are
 * typed now so the pipeline compiles end-to-end even before they exist.
 */

import type { Idea } from "../content/ideaSource.js";
import type { Research } from "../content/research.js";
import type { Hook } from "../content/hook.js";

export interface PipelineContext {
  idea: Idea;
  research: Research;
  hook: Hook;

  // Populated by later phases -- left `unknown` until each phase's real
  // module/type exists, so this interface doesn't need to change shape
  // every phase.
  script?: unknown; // Phase 4
  storyboard?: unknown; // Phase 5
  voice?: unknown; // Phase 6
  subtitle?: unknown; // Phase 7
  video?: unknown; // Phase 8
  publish?: unknown; // Phase 9
}
