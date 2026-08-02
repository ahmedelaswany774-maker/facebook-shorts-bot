import assert from "node:assert";
import { markStatus, markPublished, markFailed } from "./dashboardSync.js";

process.env.NOTION_API_KEY = "test-key";
process.env.NOTION_DATABASE_ID = "test-db-id";

let lastBody: any = null;
// @ts-expect-error test mock
globalThis.fetch = async (url: string, init: any) => {
  lastBody = JSON.parse(init.body);
  return { ok: true, json: async () => ({ id: "page-1", url: "https://notion.so/page-1", properties: {} }) };
};

async function run() {
  await markStatus("page-1", "Voice");
  assert.strictEqual(lastBody.properties.Status.status.name, "Voice");

  await markPublished("page-1", [
    { platform: "facebook", id: "fb-1", url: "https://facebook.com/videos/fb-1" },
    { platform: "youtube", id: "yt-1", url: "https://youtube.com/shorts/yt-1" },
  ]);
  assert.strictEqual(lastBody.properties.Status.status.name, "Published");
  assert.strictEqual(lastBody.properties["Video URL"].url, "https://facebook.com/videos/fb-1");
  assert.strictEqual(lastBody.properties.Platform.multi_select.length, 2);

  await markFailed("page-1", "ffmpeg blew up");
  assert.strictEqual(lastBody.properties.Status.status.name, "Failed");
  assert.ok(lastBody.properties.Caption.rich_text[0].text.content.includes("ffmpeg blew up"));

  console.log("✅ dashboardSync: all checks passed");
}

run().catch((err) => {
  console.error("❌ dashboardSync test failed:", err);
  process.exit(1);
});
