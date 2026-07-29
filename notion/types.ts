/**
 * notion/types.ts
 * Minimal typed shapes for the Notion REST API responses/requests we
 * actually use. Not exhaustive -- extend as new property types are needed.
 */

export type NotionPropertyValue =
  | { type: "title"; title: { text: { content: string } }[] }
  | { type: "rich_text"; rich_text: { text: { content: string } }[] }
  | { type: "select"; select: { name: string } }
  | { type: "status"; status: { name: string } }
  | { type: "url"; url: string | null }
  | { type: "checkbox"; checkbox: boolean }
  | { type: "number"; number: number | null };

export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, any>;
  [key: string]: any;
}

export interface NotionQueryResult {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/** The video-status values used by the Phase 10 dashboard. */
export type VideoStatus =
  | "Draft"
  | "Generating"
  | "Voice"
  | "Video"
  | "Publishing"
  | "Published"
  | "Failed";
