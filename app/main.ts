/**
 * app/main.ts
 * CLI entry point. `npm run dev` (or `npm run build && npm start`).
 */

import { runAiPipeline } from "../workflows/aiPipeline.js";

runAiPipeline().catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});
