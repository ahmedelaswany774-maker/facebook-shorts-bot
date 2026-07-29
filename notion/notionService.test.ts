/**
 * notion/notionService.test.ts
 *
 * Lightweight, dependency-free test (no Jest needed) that mocks the
 * global `fetch` to verify notionService builds correct requests and
 * parses responses, without hitting the real Notion API.
 *
 * Run with: npm run test:notion
 */

import assert from "node:assert";
import { createPage, readPage, updatePage, queryDatabase, props } from "./notionService.js";

process.env.NOTION_API_KEY = "test-key";
process.env.NOTION_DATABASE_ID = "test-db-id";

let lastCall: { url: string; init: RequestInit } | null = null;

// @ts-expect-error -- overriding global fetch for the test
globalThis.fetch = async (url: string, init: RequestInit) => {
  lastCall = { url, init };
  return {
    ok: true,
    json: async () => ({ id: "mock-page-id", url: "https://notion.so/mock", properties: {} }),
  } as Response;
};

async function run() {
  await createPage({ Name: props.title("Test video") });
  assert.ok(lastCall!.url.endsWith("/pages"));
  assert.strictEqual(lastCall!.init.method, "POST");

  await readPage("mock-page-id");
  assert.ok(lastCall!.url.endsWith("/pages/mock-page-id"));

  await updatePage("mock-page-id", { Status: props.status("Published") });
  assert.strictEqual(lastCall!.init.method, "PATCH");

  // @ts-expect-error -- override again to return a query-shaped payload
  globalThis.fetch = async (url: string, init: RequestInit) => {
    lastCall = { url, init };
    return { ok: true, json: async () => ({ results: [], has_more: false, next_cursor: null }) } as Response;
  };
  const result = await queryDatabase({ property: "Status", status: { equals: "Draft" } });
  assert.ok(lastCall!.url.includes("/databases/"));
  assert.strictEqual(result.results.length, 0);

  console.log("✅ notionService: all checks passed");
}

run().catch((err) => {
  console.error("❌ notionService test failed:", err);
  process.exit(1);
});
