/**
 * subtitle/cueBuilder.ts
 * One cue per shot, timing taken straight from the Storyboard (Phase 5)
 * -- the two stay in sync by construction instead of two separate
 * timing calculations drifting apart.
 */
import type { Storyboard } from "../storyboard/types.js";
import type { SubtitleCue } from "./types.js";

export function buildCues(storyboard: Storyboard): SubtitleCue[] {
  return storyboard.shots.map((shot, i) => ({
    index: i + 1,
    startSec: shot.subtitle.startSec,
    endSec: shot.subtitle.endSec,
    text: shot.subtitle.text,
  }));
}
