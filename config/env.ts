/**
 * config/env.ts
 *
 * Single source of truth for environment variables. Every other module
 * should import `env` from here instead of touching `process.env`
 * directly -- that keeps secrets discoverable in one place and lets us
 * validate + fail fast with a clear error instead of a cryptic crash
 * deep inside a pipeline step.
 *
 * Add new variables here as new phases are implemented.
 */

import "dotenv/config";

export interface Env {
  // Required for the AI script pipeline
  GROQ_API_KEY?: string;

  // Notion integration (Phase 2)
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;

  // Facebook Page publishing (existing, untouched)
  FB_PAGE_ACCESS_TOKEN?: string;
  FB_PAGE_ID?: string;

  // YouTube publishing (Phase 9, provider interface)
  YOUTUBE_CLIENT_ID?: string;
  YOUTUBE_CLIENT_SECRET?: string;
  YOUTUBE_REFRESH_TOKEN?: string;
}

// A Proxy keeps every field read live from process.env (instead of a
// snapshot taken once at import time). That matters for tests -- and for
// any long-running process that reloads .env -- since a plain object
// would freeze whatever values existed the moment this module first ran.
export const env: Env = new Proxy({} as Env, {
  get(_target, key: string) {
    return process.env[key];
  },
});

/**
 * Throws a clear error if any of the given keys are missing, instead of
 * letting a downstream fetch() fail with a vague "unauthorized".
 */
export function requireEnv<K extends keyof Env>(keys: K[]): void {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`
    );
  }
}
