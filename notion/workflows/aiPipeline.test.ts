/**
 * workflows/aiPipeline.test.ts
 * Mocks both the Groq and Notion HTTP calls to prove the pipeline wires
 * Idea -> Research -> Hook together correctly and syncs to Notion,
 * without hitting any real API or spending real tokens.
 */

import assert from "node:assert";

process.env.NOTION_API_KEY = "test-key";
process.env.NOTION_DATABASE_ID = "test-db-id";
process.env.GROQ_API_KEY = "test-groq-key";

let notionPatchBody: any = null;

// @ts-expect-error -- test mock
globalThis.fetch = async (url: string, init: any) => {
  // --- Notion: no queued idea waiting -> empty query result
  if (url.includes("api.notion.com") && url.includes("/query")) {
    return { ok: true, json: async () => ({ results: [], has_more: false, next_cursor: null }) };
  }
  // --- Notion: create page for the generated idea
  if (url.includes("api.notion.com") && url.endsWith("/pages") && init.method === "POST") {
    return { ok: true, json: async () => ({ id: "page-123", url: "https://notion.so/page-123", properties: {} }) };
  }
  // --- Notion: update page (hook synced as Caption)
  if (url.includes("api.notion.com") && url.includes("/pages/") && init.method === "PATCH") {
    notionPatchBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ id: "page-123", url: "https://notion.so/page-123", properties: {} }) };
  }
  // --- Groq: idea / research / hook, in call order
  if (url.includes("api.groq.com")) {
    const body = JSON.parse(init.body);
    const prompt: string = body.messages[0].content;
    if (prompt.includes('"topic"')) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"topic":"لغز اختفاء سفينة"}' } }] }) };
    }
    if (prompt.includes("keyFacts")) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"angle":"زاوية غامضة","keyFacts":["حقيقة1","حقيقة2"]}' } }] }) };
    }
    // hook prompt
    return { ok: true, json: async () => ({ choices: [{ message: { content: "هل تعلم أن سفينة اختفت بالكامل؟" } }] }) };
  }
  throw new Error(`Unmocked fetch: ${url}`);
};

async function run() {
  const { runAiPipeline } = await import("./aiPipeline.js");
  const ctx = await runAiPipeline();

  assert.strictEqual(ctx.idea.topic, "لغز اختفاء سفينة");
  assert.strictEqual(ctx.idea.source, "generated");
  assert.strictEqual(ctx.idea.notionPageId, "page-123");
  assert.strictEqual(ctx.research.angle, "زاوية غامضة");
  assert.strictEqual(ctx.research.keyFacts.length, 2);
  assert.ok(ctx.hook.text.length > 0);
  assert.ok(notionPatchBody, "expected Notion page to be updated with the hook");

  console.log("✅ aiPipeline: all checks passed");
}

run().catch((err) => {
  console.error("❌ aiPipeline test failed:", err);
  process.exit(1);
});
