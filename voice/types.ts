/**
 * voice/types.ts
 */
export interface SceneAudio {
  sceneId: number;
  audioPath: string;
  durationSec: number;
}

export interface VoiceResult {
  scenes: SceneAudio[];
  /** Merged, normalized, silence-trimmed full narration track. */
  fullAudioPath: string;
  totalDurationSec: number;
}
