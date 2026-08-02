/**
 * publish/publishers.test.ts
 * Mocks fetch for both Facebook and YouTube -- proves each publisher
 * builds the right request and parses the right response, without
 * uploading anything real.
 */
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FacebookPagePublisher } from "./facebookPublisher.js";
import { YouTubePublisher } from "./youtubePublisher.js";
import { getConfiguredPublishers } from "./index.js";

process.env.FB_PAGE_ACCESS_TOKEN = "fb-token";
process.env.FB_PAGE_ID = "12345";
process.env.YOUTUBE_CLIENT_ID = "yt-client";
process.env.YOUTUBE_CLIENT_SECRET = "yt-secret";
process.env.YOUTUBE_REFRESH_TOKEN = "yt-refresh";

async function run() {
  const tmpVideo = path.join("output", "publishers-test-tmp.mp4");
  await fs.writeFile(tmpVideo, Buffer.from("fake-mp4-bytes"));

  // --- Facebook ---
  let fbCall: { url: string; init: any } | null = null;
  // @ts-expect-error test mock
  globalThis.fetch = async (url: string, init: any) => {
    fbCall = { url, init };
    return { ok: true, json: async () => ({ id: "fb-video-999" }) };
  };
  const fb = new FacebookPagePublisher();
  const fbResult = await fb.publish(tmpVideo, "caption text");
  assert.strictEqual(fbResult.platform, "facebook");
  assert.strictEqual(fbResult.id, "fb-video-999");
  assert.ok(fbCall!.url.includes("graph-video.facebook.com"));
  assert.ok(fbCall!.url.includes("/12345/videos"));

  // --- YouTube ---
  const calls: string[] = [];
  // @ts-expect-error test mock
  globalThis.fetch = async (url: string, init: any) => {
    calls.push(url);
    if (url.includes("oauth2.googleapis.com")) {
      return { ok: true, json: async () => ({ access_token: "yt-access-token" }) };
    }
    if (url.includes("googleapis.com/upload/youtube")) {
      assert.ok(init.headers.Authorization.includes("yt-access-token"));
      return { ok: true, json: async () => ({ id: "yt-video-abc" }) };
    }
    throw new Error(`Unmocked fetch: ${url}`);
  };
  const yt = new YouTubePublisher();
  const ytResult = await yt.publish(tmpVideo, "My Title\nRest of description here");
  assert.strictEqual(ytResult.platform, "youtube");
  assert.strictEqual(ytResult.id, "yt-video-abc");
  assert.strictEqual(ytResult.url, "https://youtube.com/shorts/yt-video-abc");
  assert.strictEqual(calls.length, 2);

  // --- Registry picks up both when configured ---
  const configured = getConfiguredPublishers();
  assert.strictEqual(configured.length, 2);

  await fs.unlink(tmpVideo).catch(() => {});
  console.log("✅ publishers: all checks passed");
}

run().catch((err) => {
  console.error("❌ publishers test failed:", err);
  process.exit(1);
});
