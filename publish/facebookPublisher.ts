/**
 * publish/facebookPublisher.ts
 * Direct TypeScript port of generate_facebook_short.py's
 * `publish_to_facebook_page()` -- same endpoint, same required env vars,
 * same "Page only, never personal profile" guarantee. Behavior is not
 * changed, only the language.
 */

import { promises as fs } from "node:fs";
import { env, requireEnv } from "../config/env.js";
import type { Publisher, PublishResult } from "./types.js";

const FB_GRAPH_VERSION = "v21.0";

export class FacebookPagePublisher implements Publisher {
  readonly platform = "facebook" as const;

  async publish(videoPath: string, caption: string): Promise<PublishResult> {
    requireEnv(["FB_PAGE_ACCESS_TOKEN", "FB_PAGE_ID"]);

    const url = `https://graph-video.facebook.com/${FB_GRAPH_VERSION}/${env.FB_PAGE_ID}/videos`;
    const videoBytes = await fs.readFile(videoPath);

    const form = new FormData();
    form.append("access_token", env.FB_PAGE_ACCESS_TOKEN!);
    form.append("description", caption);
    form.append("source", new Blob([videoBytes]), "video.mp4");

    const res = await fetch(url, { method: "POST", body: form });
    const result = (await res.json()) as { id?: string; error?: unknown };

    if (!res.ok) {
      throw new Error(`Facebook publish failed: ${JSON.stringify(result)}`);
    }
    if (!result.id) {
      throw new Error(`Facebook API did not return a video id: ${JSON.stringify(result)}`);
    }

    return { platform: "facebook", id: result.id };
  }
}
