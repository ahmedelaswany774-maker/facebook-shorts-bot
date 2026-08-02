/**
 * app/main.ts
 * CLI entry point for the FULL pipeline (Idea -> ... -> Publish).
 * `npm run dev` (or `npm run build && npm start`).
 * For a content-only dry run (no TTS/images/video/publish spend), use
 * `npm run dev:draft` instead (see app/draftOnly.ts).
 */

import { runFullPipeline } from "../workflows/fullPipeline.js";

runFullPipeline().catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});
