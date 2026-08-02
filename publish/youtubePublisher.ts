/**
 * publish/youtubePublisher.ts
 * YouTube Data API v3 video upload using a user OAuth refresh token
 * (free -- the standard YouTube Data API quota, no paid tier). Uses a
 * hand-built multipart/related request instead of the `googleapis`
 * package to keep the project dependency-light and Termux-friendly.
 *
 * Setup (documented in README): create an OAuth client in Google Cloud
 * Console, run the standard OAuth consent flow once to get a refresh
 * token, then set YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET /
 * YOUTUBE_REFRESH_TOKEN.
 */

import { promises as fs } from "node:fs";
import { env, requireEnv } from "../config/env.js";
import type { Publisher, PublishResult } from "./types.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";

async function getAccessToken(): Promise<string> {
  requireEnv(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID!,
      client_secret: env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: env.YOUTUBE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`YouTube token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/** Splits "caption" into a short title (first line) + description (rest). */
function splitCaption(caption: string): { title: string; description: string } {
  const [first, ...rest] = caption.split("\n");
  const title = first.slice(0, 95); // YouTube title limit is 100 chars
  return { title, description: rest.join("\n") || caption };
}

export class YouTubePublisher implements Publisher {
  readonly platform = "youtube" as const;

  async publish(videoPath: string, caption: string): Promise<PublishResult> {
    const accessToken = await getAccessToken();
    const { title, description } = splitCaption(caption);
    const videoBytes = await fs.readFile(videoPath);

    const metadata = {
      snippet: {
        title,
        description,
        categoryId: "24", // Entertainment
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    const boundary = `----ts-yt-upload-${Date.now()}`;
    const preamble =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(preamble, "utf-8"),
      videoBytes,
      Buffer.from(closing, "utf-8"),
    ]);

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const result = (await res.json()) as { id?: string; error?: unknown };
    if (!res.ok || !result.id) {
      throw new Error(`YouTube upload failed: ${JSON.stringify(result)}`);
    }

    return {
      platform: "youtube",
      id: result.id,
      url: `https://youtube.com/shorts/${result.id}`,
    };
  }
}
