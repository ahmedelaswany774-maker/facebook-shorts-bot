/**
 * publish/index.ts
 * Returns every Publisher whose required env vars are actually set, so
 * the pipeline can publish to Facebook, YouTube, both, or neither
 * without the caller having to know which credentials exist.
 */
import { env } from "../config/env.js";
import { FacebookPagePublisher } from "./facebookPublisher.js";
import { YouTubePublisher } from "./youtubePublisher.js";
import type { Publisher } from "./types.js";

export function getConfiguredPublishers(): Publisher[] {
  const publishers: Publisher[] = [];

  if (env.FB_PAGE_ACCESS_TOKEN && env.FB_PAGE_ID) {
    publishers.push(new FacebookPagePublisher());
  }
  if (env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET && env.YOUTUBE_REFRESH_TOKEN) {
    publishers.push(new YouTubePublisher());
  }

  return publishers;
}

export * from "./types.js";
export { FacebookPagePublisher } from "./facebookPublisher.js";
export { YouTubePublisher } from "./youtubePublisher.js";
