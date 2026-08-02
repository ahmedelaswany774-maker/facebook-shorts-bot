/**
 * workflows/fullPipeline.test.ts
 * The full 10-phase chain in one run. Groq, Notion, Facebook, and
 * YouTube are mocked (no network in this sandbox) -- but Storyboard,
 * Voice, Subtitle, and Video all run for real against real ffmpeg, so
 * this proves the actual data flowing between every phase is shaped
 * correctly, not just that each phase works in isolation.
 */
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runFfmpeg } from "../utils/ffmpeg.js";
import type { ImageProvider } from "../image/imageProvider.js";
import type { TTSProvider } from "../voice/ttsProvider.js";

process.env.NOTION_API_KEY = "test-key";
process.env.NOTION_DATABASE_ID = "test-db-id";
process.env.GROQ_API_KEY = "test-groq-key";
process.env.FB_PAGE_ACCESS_TOKEN = "fb-token";
process.env.FB_PAGE_ID = "12345";

class FakeColorImageProvider implements ImageProvider {
  private i = 0;
  async generate(_prompt: string, outPath: string): Promise<void> {
    const colors = ["red", "green", "blue", "yellow", "purple"];
    const color = colors[this.i++ % colors.length];
    await runFfmpeg(["-f", "lavfi", "-i", `color=c=${color}:s=360x640`, "-frames:v", "1", outPath]);
  }
}

// Swap the real (networked) TTS provider used inside voicePipeline by
// monkey-patching the module the same way we mock fetch elsewhere: we
// can't easily inject it into fullPipeline (which constructs its own),
// so this test mocks fetch for TTS too, returning a tiny valid mp3
// generated once via ffmpeg and reused for every sentence.
async function makeToneBytes(): Promise<Buffer> {
  const tmp = path.join("output", "fullpipeline-test-tone.mp3");
  await runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=440:duration=1", tmp]);
  const buf = await fs.readFile(tmp);
  await fs.unlink(tmp).catch(() => {});
  return buf;
}

async function run() {
  const toneBytes = await makeToneBytes();

  // @ts-expect-error test mock
  globalThis.fetch = async (url: string, init: any) => {
    // --- Notion ---
    if (url.includes("api.notion.com") && url.includes("/query")) {
      return { ok: true, json: async () => ({ results: [], has_more: false, next_cursor: null }) };
    }
    if (url.includes("api.notion.com") && url.endsWith("/pages") && init.method === "POST") {
      return { ok: true, json: async () => ({ id: "page-full-1", url: "https://notion.so/page-full-1", properties: {} }) };
    }
    if (url.includes("api.notion.com") && url.includes("/pages/") && init.method === "PATCH") {
      return { ok: true, json: async () => ({ id: "page-full-1", url: "https://notion.so/page-full-1", properties: {} }) };
    }
    // --- Groq ---
    if (url.includes("api.groq.com")) {
      const body = JSON.parse(init.body);
      const prompt: string = body.messages[0].content;
      if (prompt.includes('"topic"')) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"topic":"موضوع تجريبي"}' } }] }) };
      }
      if (prompt.includes("keyFacts") && !prompt.includes('"scenes"')) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"angle":"زاوية","keyFacts":["حقيقة"]}' } }] }) };
      }
      if (prompt.includes('"scenes"')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({
              scenes: [
                { durationSec: 2, narration: "جملة المشهد الأول.", imagePrompt: "prompt one" },
                { durationSec: 2, narration: "جملة المشهد الثاني.", imagePrompt: "prompt two" },
              ],
            }) } }],
          }),
        };
      }
      return { ok: true, json: async () => ({ choices: [{ message: { content: "هوك تجريبي" } }] }) };
    }
    // --- TTS (Google Translate endpoint) ---
    if (url.includes("translate.google.com")) {
      return { ok: true, arrayBuffer: async () => toneBytes.buffer.slice(toneBytes.byteOffset, toneBytes.byteOffset + toneBytes.byteLength) };
    }
    // --- Facebook publish ---
    if (url.includes("graph-video.facebook.com")) {
      return { ok: true, json: async () => ({ id: "fb-video-full-1" }) };
    }
    throw new Error(`Unmocked fetch in fullPipeline test: ${url}`);
  };

  const { runFullPipeline } = await import("./fullPipeline.js");
  const ctx = await runFullPipeline({ imageProvider: new FakeColorImageProvider() });

  assert.strictEqual(ctx.script.scenes.length, 2);
  assert.strictEqual(ctx.storyboard!.shots.length, 2);
  assert.ok(ctx.voice!.totalDurationSec > 0);
  assert.ok(ctx.subtitle!.srtPath.endsWith(".srt"));
  assert.ok(ctx.video!.durationSec > 0);
  assert.ok(ctx.publish && ctx.publish.length === 1 && ctx.publish[0].id === "fb-video-full-1");

  const videoExists = await fs.stat(ctx.video!.path).then(() => true).catch(() => false);
  assert.ok(videoExists, "expected the final rendered video file to exist on disk");

  console.log(
    `✅ fullPipeline: all 10 phases wired correctly (video: ${ctx.video!.durationSec.toFixed(2)}s, published: ${ctx.publish![0].platform}/${ctx.publish![0].id})`
  );
}

run().catch((err) => {
  console.error("❌ fullPipeline test failed:", err);
  process.exit(1);
});
