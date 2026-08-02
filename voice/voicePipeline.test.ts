/**
 * voice/voicePipeline.test.ts
 * Uses a fake TTSProvider that generates a short sine-wave tone via
 * ffmpeg's `lavfi` source instead of calling the real (networked) TTS
 * endpoint -- this lets concat/normalize/trim run against *real* ffmpeg
 * and produce a real, playable output file.
 */
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateVoice } from "./voicePipeline.js";
import { getDurationSec, runFfmpeg } from "../utils/ffmpeg.js";
import type { TTSProvider } from "./ttsProvider.js";
import type { Script } from "../script/types.js";

class FakeToneTTSProvider implements TTSProvider {
  async synthesize(text: string, outPath: string): Promise<void> {
    // 1 second of silence + a short 440Hz tone, roughly proportional to
    // sentence length, so scenes end up with plausibly different durations.
    const seconds = Math.max(1, Math.min(3, Math.ceil(text.length / 20)));
    await runFfmpeg([
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${seconds}`,
      "-ac",
      "1",
      outPath,
    ]);
  }
}

const script: Script = {
  topic: "test",
  scenes: [
    { id: 1, durationSec: 3, narration: "جملة أولى قصيرة. جملة ثانية أطول شوية.", imagePrompt: "x" },
    { id: 2, durationSec: 2, narration: "مشهد تاني بجملة واحدة بس.", imagePrompt: "y" },
  ],
  totalDurationSec: 5,
  fullNarration: "...",
};

async function run() {
  const outDir = path.join("output", "voice-test-tmp");
  await fs.rm(outDir, { recursive: true, force: true });

  const result = await generateVoice(script, outDir, new FakeToneTTSProvider());

  assert.strictEqual(result.scenes.length, 2);
  for (const scene of result.scenes) {
    const exists = await fs.stat(scene.audioPath).then(() => true).catch(() => false);
    assert.ok(exists, `expected ${scene.audioPath} to exist`);
    assert.ok(scene.durationSec > 0);
  }

  const fullExists = await fs.stat(result.fullAudioPath).then(() => true).catch(() => false);
  assert.ok(fullExists, "expected merged/normalized/trimmed full audio to exist");
  assert.ok(result.totalDurationSec > 0);

  const realDuration = await getDurationSec(result.fullAudioPath);
  assert.ok(Math.abs(realDuration - result.totalDurationSec) < 0.5);

  await fs.rm(outDir, { recursive: true, force: true });
  console.log(`✅ voicePipeline: all checks passed (full track: ${result.totalDurationSec.toFixed(2)}s)`);
}

run().catch((err) => {
  console.error("❌ voicePipeline test failed:", err);
  process.exit(1);
});
