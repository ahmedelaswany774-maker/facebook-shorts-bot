/**
 * notion/notionService.ts
 *
 * Thin, dependency-free wrapper around the Notion REST API (no
 * @notionhq/client needed -- Node 18's built-in fetch is enough, which
 * keeps this friendly to run under Termux). Every function is a pure
 * async call: no hidden global state, so each one is independently
 * testable by mocking `fetch`.
 *
 * Requires env vars (see config/env.ts):
 *   NOTION_API_KEY
 *   NOTION_DATABASE_ID
 */

import { env, requireEnv } from "../config/env.js";
import type { NotionPage, NotionQueryResult } from "./types.js";

const NOTION_VERSION = "2022-06-28";
const BASE_URL = "https://api.notion.com/v1";

function authHeaders(): Record<string, string> {
  requireEnv(["NOTION_API_KEY"]);
  return {
    Authorization: `Bearer ${env.NOTION_API_KEY}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Notion API error ${res.status} ${res.statusText} on ${path}: ${body}`
    );
  }
  return (await res.json()) as T;
}

/**
 * Create a new page in the configured database.
 * `properties` must match the Notion property schema of that database.
 */
export async function createPage(
  properties: Record<string, unknown>,
  databaseId: string = env.NOTION_DATABASE_ID ?? ""
): Promise<NotionPage> {
  requireEnv(["NOTION_DATABASE_ID"]);
  return notionRequest<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
}

/** Read a single page by its Notion page id. */
export async function readPage(pageId: string): Promise<NotionPage> {
  return notionRequest<NotionPage>(`/pages/${pageId}`, { method: "GET" });
}

/** Patch/update properties on an existing page (partial update). */
export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  return notionRequest<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

/**
 * Query the configured database, optionally with a Notion filter/sort
 * payload (passed through as-is -- see Notion's "Query a database" docs).
 */
export async function queryDatabase(
  filter?: Record<string, unknown>,
  sorts?: Record<string, unknown>[],
  databaseId: string = env.NOTION_DATABASE_ID ?? ""
): Promise<NotionQueryResult> {
  requireEnv(["NOTION_DATABASE_ID"]);
  return notionRequest<NotionQueryResult>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ filter, sorts }),
  });
}

/** Convenience builders for the property shapes we use most often. */
export const props = {
  title: (text: string) => ({
    title: [{ text: { content: text } }],
  }),
  richText: (text: string) => ({
    rich_text: [{ text: { content: text } }],
  }),
  status: (name: string) => ({ status: { name } }),
  select: (name: string) => ({ select: { name } }),
  url: (url: string) => ({ url }),
  checkbox: (checked: boolean) => ({ checkbox: checked }),
  number: (n: number) => ({ number: n }),
};
