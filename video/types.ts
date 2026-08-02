/**
 * video/types.ts
 */
export interface SoundEffect {
  audioPath: string;
  atSec: number;
}

export interface VideoBuildOptions {
  /** One local image file per Storyboard shot, same order. */
  imagePaths: string[];
  /** Full narration track (from voice/voicePipeline.ts). */
  voiceAudioPath: string;
  outPath: string;
  /** Burned-in animated subtitles (.ass, from subtitle/assGenerator.ts). */
  subtitleAssPath?: string;
  /** PNG with transparency, overlaid bottom-right. */
  watermarkPath?: string;
  /** Looped under the narration at low volume. */
  musicPath?: string;
  musicVolume?: number; // 0-1, default 0.15
  soundEffects?: SoundEffect[];
  width?: number; // default 1080
  height?: number; // default 1920
  fps?: number; // default 30
}

export interface VideoResult {
  path: string;
  durationSec: number;
}
