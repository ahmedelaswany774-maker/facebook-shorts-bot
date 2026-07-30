/**
 * script/types.ts
 * Scene-based script output (Phase 4) -- replaces the old single-
 * paragraph script with numbered scenes, each independently timed and
 * carrying its own image prompt, so Storyboard (Phase 5) and Voice
 * (Phase 6) can work scene-by-scene instead of guessing beat splits.
 */

export interface Scene {
  /** 1-based scene number, in narration order. */
  id: number;
  /** Estimated spoken duration for this scene's narration, in seconds. */
  durationSec: number;
  /** The Arabic narration line(s) for this scene. */
  narration: string;
  /** A visual prompt describing the image/shot for this scene. */
  imagePrompt: string;
}

export interface Script {
  topic: string;
  scenes: Scene[];
  /** Sum of every scene's durationSec -- the model decides the video's
   *  total length based on how much the topic warrants, it isn't fixed. */
  totalDurationSec: number;
  /** All narration lines joined in order -- useful for a single-file TTS
   *  pass (current pipeline) even though voice (Phase 6) will eventually
   *  synthesize per-scene instead. */
  fullNarration: string;
}
