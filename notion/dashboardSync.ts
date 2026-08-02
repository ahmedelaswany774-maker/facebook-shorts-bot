/**
 * notion/dashboardSync.ts
 * Every status transition the dashboard cares about, in one place, so
 * the pipeline orchestrator just calls these instead of hand-building
 * Notion property payloads at each stage.
 */
import { updatePage, props } from "./notionService.js";
import type { VideoStatus } from "./types.js";
import type { PublishResult } from "../publish/types.js";

export async function markStatus(pageId: string, status: VideoStatus): Promise<void> {
  await updatePage(pageId, { Status: props.status(status) });
}

export async function markPublished(
  pageId: string,
  results: PublishResult[]
): Promise<void> {
  const primary = results.find((r) => r.url) ?? results[0];
  await updatePage(pageId, {
    Status: props.status("Published"),
    ...(primary?.url ? { "Video URL": props.url(primary.url) } : {}),
    Platform: {
      multi_select: results.map((r) => ({
        name: r.platform === "facebook" ? "Facebook" : "YouTube",
      })),
    },
  });
}

export async function markFailed(pageId: string, errorMessage: string): Promise<void> {
  await updatePage(pageId, {
    Status: props.status("Failed"),
    Caption: props.richText(`❌ ${errorMessage.slice(0, 1900)}`),
  });
}
