/**
 * content/ideaSource.ts
 * The "Idea" step of the pipeline.
 *
 * Behavior (per project decision): check the Notion database first for a
 * queued topic (a page with Status = "Draft" and no "Video URL" yet). If
 * one exists, use it. Otherwise, ask Groq to generate a topic and create
 * a new tracking page in Notion so it shows up on the dashboard.
 */

import { askGroqJSON } from "../utils/groqClient.js";
import { buildIdeaPrompt } from "../prompts/idea.prompt.js";
import { queryDatabase, createPage, props } from "../notion/notionService.js";
import type { NotionPage } from "../notion/types.js";

export interface Idea {
  topic: string;
  source: "notion" | "generated";
  /** Present when the idea is tied to a Notion page (queued or newly created). */
  notionPageId?: string;
}

function titleOf(page: NotionPage): string {
  const titleProp = Object.values(page.properties).find(
    (p: any) => p.type === "title"
  ) as any;
  return titleProp?.title?.[0]?.plain_text ?? "";
}

/** Looks for a queued idea: Status = Draft AND Video URL is empty. */
async function findQueuedIdea(): Promise<NotionPage | null> {
  const result = await queryDatabase(
    {
      and: [
        { property: "Status", select: { equals: "Draft" } },
        { property: "Video URL", url: { is_empty: true } },
      ],
    },
    [{ property: "Created", direction: "ascending" }]
  );
  return result.results[0] ?? null;
}

export async function getNextIdea(): Promise<Idea> {
  const queued = await findQueuedIdea();
  if (queued) {
    return {
      topic: titleOf(queued),
      source: "notion",
      notionPageId: queued.id,
    };
  }

  const generated = await askGroqJSON<{ topic: string }>(buildIdeaPrompt());
  const page = await createPage({
    Name: props.title(generated.topic),
    Status: props.status("Generating"),
  });

  return {
    topic: generated.topic,
    source: "generated",
    notionPageId: page.id,
  };
}
