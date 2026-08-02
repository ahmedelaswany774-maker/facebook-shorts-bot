/**
 * video/ffmpegVideoBuilder.test.ts
 * Generates synthetic images/audio/watermark with ffmpeg itself (no
 * network) so the full filter_complex graph (zoompan + xfade + overlay
 * + subtitles + audio mix) actually runs against real ffmpeg and
 * produces a real, ffprobe-verifiable mp4.
 */
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runFfmpeg, getDurationSec } from "../utils/ffmpeg.js";
import { buildVideo } from "./ffmpegVideoBuilder.js";
import { generateASS } from "../subtitle/assGenerator.js";
import type { Shot } from "../storyboard/types.js";

async function makeColorImage(color: string, outPath: string) {
  await runFfmpeg(["-f", "lavfi", "-i", `color=c=${color}:s=640x360`, "-frames:v", "1", outPath]);
}

async function makeTone(freq: number, seconds: number, outPath: string) {
  await runFfmpeg(["-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, outPath]);
}

async function run() {
  const tmp = path.join("output", "video-test-tmp");
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp, { recursive: true });

  const img0 = path.join(tmp, "img0.jpg");
  const img1 = path.join(tmp, "img1.jpg");
  const img2 = path.join(tmp, "img2.jpg");
  await makeColorImage("red", img0);
  await makeColorImage("green", img1);
  await makeColorImage("blue", img2);

  const voicePath = path.join(tmp, "voice.mp3");
  await makeTone(440, 4, voicePath);

  const musicPath = path.join(tmp, "music.mp3");
  await makeTone(220, 2, musicPath);

  const watermarkPath = path.join(tmp, "watermark.png");
  await runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=white@0.6:s=200x80",
    "-frames:v",
    "1",
    watermarkPath,
  ]);

  const assPath = path.join(tmp, "subs.ass");
  const assContent = generateASS([
    { index: 1, startSec: 0, endSec: 1.5, text: "test one" },
    { index: 2, startSec: 1.5, endSec: 4, text: "test two" },
  ]);
  await fs.writeFile(assPath, assContent, "utf-8");

  const shots: Shot[] = [
    {
      sceneId: 1,
      durationSec: 1.5,
      imagePrompt: "x",
      cameraMovement: "zoom-in",
      transitionToNext: "cross-fade",
      animationType: "fade",
      subtitle: { text: "test one", startSec: 0, endSec: 1.5 },
    },
    {
      sceneId: 2,
      durationSec: 1.5,
      imagePrompt: "y",
      cameraMovement: "pan-left",
      transitionToNext: "blur",
      animationType: "ken-burns",
      subtitle: { text: "test two", startSec: 1.5, endSec: 3 },
    },
    {
      sceneId: 3,
      durationSec: 1.5,
      imagePrompt: "z",
      cameraMovement: "zoom-out",
      transitionToNext: "cut",
      animationType: "ken-burns",
      subtitle: { text: "test three", startSec: 3, endSec: 4.5 },
    },
  ];

  const outPath = path.join(tmp, "final.mp4");
  const result = await buildVideo(shots, {
    imagePaths: [img0, img1, img2],
    voiceAudioPath: voicePath,
    outPath,
    subtitleAssPath: assPath,
    watermarkPath,
    musicPath,
    soundEffects: [{ audioPath: musicPath, atSec: 0.5 }],
    width: 360,
    height: 640,
    fps: 24,
  });

  const exists = await fs.stat(outPath).then(() => true).catch(() => false);
  assert.ok(exists, "expected final.mp4 to exist");
  assert.ok(result.durationSec > 0);

  const realDuration = await getDurationSec(outPath);
  assert.ok(realDuration > 1, `expected a multi-second video, got ${realDuration}s`);

  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`✅ ffmpegVideoBuilder: all checks passed (output: ${realDuration.toFixed(2)}s)`);
}

run().catch((err) => {
  console.error("❌ ffmpegVideoBuilder test failed:", err);
  process.exit(1);
});
