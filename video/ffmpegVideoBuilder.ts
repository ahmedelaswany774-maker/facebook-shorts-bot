/**
 * video/ffmpegVideoBuilder.ts
 * Builds the final vertical video from Storyboard-driven shots:
 *   - Ken Burns (zoom-in/zoom-out/pan-left/pan-right) per image via zoompan
 *   - Cross-fade / blur transitions between shots via xfade
 *   - Logo/watermark overlay
 *   - Background music mixed under the narration
 *   - Optional sound effects at specific timestamps
 *   - Animated subtitles burned in via the `ass` filter
 *
 * One process spawn, one filter_complex graph -- built programmatically
 * so it scales to any number of shots.
 */

import path from "node:path";
import { runFfmpeg, getDurationSec } from "../utils/ffmpeg.js";
import type { Shot, Storyboard } from "../storyboard/types.js";
import type { VideoBuildOptions, VideoResult } from "./types.js";

function escapeFilterPath(p: string): string {
  // ffmpeg filter option values treat `:` and `'` specially -- escape both,
  // and always use an absolute, forward-slash path.
  return path.resolve(p).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function zoompanExprFor(movement: Shot["cameraMovement"], frames: number) {
  switch (movement) {
    case "zoom-in":
      return { z: "min(zoom+0.0015,1.2)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case "zoom-out":
      return { z: "if(eq(on,0),1.2,max(1.0,zoom-0.0015))", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case "pan-left":
      return { z: "1.15", x: `(iw-iw/zoom)*(1-on/${frames})`, y: "ih/2-(ih/zoom/2)" };
    case "pan-right":
      return { z: "1.15", x: `(iw-iw/zoom)*(on/${frames})`, y: "ih/2-(ih/zoom/2)" };
    case "static":
    default:
      return { z: "1.0", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
  }
}

function transitionNameFor(t: Shot["transitionToNext"]): string {
  if (t === "blur") return "hblur";
  return "fade"; // covers "cross-fade" and "cut" (cut uses a near-zero duration below)
}

export async function buildVideo(
  shots: Shot[],
  opts: VideoBuildOptions
): Promise<VideoResult> {
  const {
    imagePaths,
    voiceAudioPath,
    outPath,
    subtitleAssPath,
    watermarkPath,
    musicPath,
    musicVolume = 0.15,
    soundEffects = [],
    width = 1080,
    height = 1920,
    fps = 30,
  } = opts;

  if (imagePaths.length !== shots.length) {
    throw new Error(
      `buildVideo: expected ${shots.length} images (one per shot), got ${imagePaths.length}`
    );
  }

  const args: string[] = [];

  // --- Inputs. Index tracking is manual (matches ffmpeg's -i order). ---
  shots.forEach((shot, i) => {
    args.push("-loop", "1", "-t", String(shot.durationSec), "-i", imagePaths[i]);
  });
  let nextIndex = shots.length;

  const voiceInputIndex = nextIndex++;
  args.push("-i", voiceAudioPath);

  let watermarkInputIndex = -1;
  if (watermarkPath) {
    watermarkInputIndex = nextIndex++;
    args.push("-i", watermarkPath);
  }

  let musicInputIndex = -1;
  if (musicPath) {
    musicInputIndex = nextIndex++;
    args.push("-stream_loop", "-1", "-i", musicPath);
  }

  const sfxInputIndexes: number[] = [];
  for (const sfx of soundEffects) {
    sfxInputIndexes.push(nextIndex++);
    args.push("-i", sfx.audioPath);
  }

  // --- 1. Per-image scale + zoompan (Ken Burns) ---
  const filters: string[] = [];
  shots.forEach((shot, i) => {
    const frames = Math.max(1, Math.round(shot.durationSec * fps));
    const { z, x, y } = zoompanExprFor(shot.cameraMovement, frames);
    filters.push(
      `[${i}:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,` +
        `crop=${width * 2}:${height * 2},` +
        `zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${width}x${height}:fps=${fps},` +
        `trim=duration=${shot.durationSec},setpts=PTS-STARTPTS,` +
        `format=yuv420p[v${i}z]`
    );
  });

  // --- 2. Chain xfade transitions across all shots ---
  let videoLabel = "v0z";
  let cumulativeSec = shots[0].durationSec;
  for (let i = 1; i < shots.length; i++) {
    const prevShot = shots[i - 1];
    const overlap =
      prevShot.transitionToNext === "cut"
        ? 0.001
        : Math.max(0.15, Math.min(0.5, prevShot.durationSec / 3, shots[i].durationSec / 3));
    const offset = Math.max(0, cumulativeSec - overlap);
    const transition = transitionNameFor(prevShot.transitionToNext);
    const outLabel = `vx${i}`;
    filters.push(
      `[${videoLabel}][v${i}z]xfade=transition=${transition}:duration=${overlap.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`
    );
    cumulativeSec = cumulativeSec + shots[i].durationSec - overlap;
    videoLabel = outLabel;
  }

  // --- 3. Watermark overlay ---
  if (watermarkInputIndex >= 0) {
    filters.push(`[${videoLabel}][${watermarkInputIndex}:v]overlay=W-w-40:H-h-60[vwm]`);
    videoLabel = "vwm";
  }

  // --- 4. Burn subtitles ---
  if (subtitleAssPath) {
    filters.push(`[${videoLabel}]ass=filename='${escapeFilterPath(subtitleAssPath)}'[vsub]`);
    videoLabel = "vsub";
  }

  // --- 5. Audio: voice + optional music + optional SFX ---
  let audioMap = `${voiceInputIndex}:a`;
  const audioMixInputs: string[] = [`[${voiceInputIndex}:a]`];

  if (musicInputIndex >= 0) {
    filters.push(`[${musicInputIndex}:a]volume=${musicVolume}[music]`);
    audioMixInputs.push("[music]");
  }

  sfxInputIndexes.forEach((inputIdx, i) => {
    const delayMs = Math.round(soundEffects[i].atSec * 1000);
    filters.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}[sfx${i}]`);
    audioMixInputs.push(`[sfx${i}]`);
  });

  if (audioMixInputs.length > 1) {
    filters.push(
      `${audioMixInputs.join("")}amix=inputs=${audioMixInputs.length}:duration=first:dropout_transition=0[aout]`
    );
    audioMap = "[aout]";
  }

  args.push("-filter_complex", filters.join(";"));
  args.push("-map", `[${videoLabel}]`);
  args.push("-map", audioMap.startsWith("[") ? audioMap : `${audioMap}`);

  args.push(
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    outPath
  );

  await runFfmpeg(args);

  return {
    path: outPath,
    durationSec: await getDurationSec(outPath),
  };
}

export async function buildVideoFromStoryboard(
  storyboard: Storyboard,
  opts: VideoBuildOptions
): Promise<VideoResult> {
  return buildVideo(storyboard.shots, opts);
}
