/**
 * voice/voicePipeline.ts
 * Per scene: split narration into sentences -> synthesize each
 * separately -> concat into one file per scene. Then concat all scene
 * files into a full track, normalize loudness, and trim silence.
 *
 * Each ffmpeg step is a separate, independently-testable function so a
 * unit test can exercise concat/normalize/trim on synthetic audio
 * without ever calling the (networked) TTS provider.
 */

import path from "node:path";
import { promises as fs } from "node:fs";
import type { Script } from "../script/types.js";
import type { SceneAudio, VoiceResult } from "./types.js";
import { splitIntoSentences } from "./sentenceSplitter.js";
import { GoogleTranslateTTSProvider, type TTSProvider } from "./ttsProvider.js";
import { runFfmpeg, getDurationSec, concatListContent } from "../utils/ffmpeg.js";

/** Concats a list of audio files (same codec) into one, via ffmpeg's concat demuxer. */
export async function concatAudio(inputPaths: string[], outPath: string): Promise<void> {
  const listPath = `${outPath}.concat.txt`;
  await fs.writeFile(listPath, concatListContent(inputPaths), "utf-8");
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath]);
  await fs.unlink(listPath).catch(() => {});
}

/** EBU R128 loudness normalization -- consistent volume across scenes/sentences. */
export async function normalizeVolume(inPath: string, outPath: string): Promise<void> {
  await runFfmpeg(["-i", inPath, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", outPath]);
}

/** Trims leading/trailing silence (and long internal gaps) below -35dB. */
export async function trimSilence(inPath: string, outPath: string): Promise<void> {
  await runFfmpeg([
    "-i",
    inPath,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.2:" +
      "stop_periods=1:stop_threshold=-35dB:stop_silence=0.2",
    outPath,
  ]);
}

export async function generateVoice(
  script: Script,
  outDir: string,
  ttsProvider: TTSProvider = new GoogleTranslateTTSProvider()
): Promise<VoiceResult> {
  await fs.mkdir(outDir, { recursive: true });

  const scenes: SceneAudio[] = [];

  for (const scene of script.scenes) {
    const sentences = splitIntoSentences(scene.narration);
    const sentenceFiles: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentencePath = path.join(outDir, `scene-${scene.id}-sentence-${i}.mp3`);
      await ttsProvider.synthesize(sentences[i], sentencePath);
      sentenceFiles.push(sentencePath);
    }

    const scenePath = path.join(outDir, `scene-${scene.id}.mp3`);
    if (sentenceFiles.length === 1) {
      await fs.copyFile(sentenceFiles[0], scenePath);
    } else {
      await concatAudio(sentenceFiles, scenePath);
    }

    scenes.push({
      sceneId: scene.id,
      audioPath: scenePath,
      durationSec: await getDurationSec(scenePath),
    });
  }

  const rawFullPath = path.join(outDir, "full-raw.mp3");
  await concatAudio(
    scenes.map((s) => s.audioPath),
    rawFullPath
  );

  const normalizedPath = path.join(outDir, "full-normalized.mp3");
  await normalizeVolume(rawFullPath, normalizedPath);

  const fullAudioPath = path.join(outDir, "full.mp3");
  await trimSilence(normalizedPath, fullAudioPath);

  return {
    scenes,
    fullAudioPath,
    totalDurationSec: await getDurationSec(fullAudioPath),
  };
}
