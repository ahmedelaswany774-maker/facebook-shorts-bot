/**
 * app/draftOnly.ts
 * Runs just Idea -> Research -> Hook -> Script and stops -- useful to
 * sanity-check content quality/cost without spending on TTS, image
 * generation, video rendering, or publishing. `npm run dev:draft`.
 */

import { runAiPipeline } from "../workflows/aiPipeline.js";

runAiPipeline().catch((err) => {
  console.error("❌ Draft pipeline failed:", err);
  process.exit(1);
});
