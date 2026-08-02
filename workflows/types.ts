/**
 * workflows/types.ts
 * The context object threaded through the whole AI Pipeline. Each phase
 * adds its own field once implemented -- later phases (4-10) fields are
 * typed now so the pipeline compiles end-to-end even before they exist.
 */

import type { Idea } from "../content/ideaSource.js";
import type { Research } from "../content/research.js";
import type { Hook } from "../content/hook.js";
import type { Script } from "../script/types.js";
import type { Storyboard } from "../storyboard/types.js";
import type { VoiceResult } from "../voice/types.js";
import type { VideoResult } from "../video/types.js";
import type { PublishResult } from "../publish/types.js";

export interface PipelineContext {
  idea: Idea;
  research: Research;
  hook: Hook;
  script: Script;
  storyboard?: Storyboard;
  voice?: VoiceResult;
  subtitle?: { srtPath: string; assPath: string };
  video?: VideoResult;
  publish?: PublishResult[];
}
