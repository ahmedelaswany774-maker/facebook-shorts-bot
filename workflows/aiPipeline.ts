/**
 * workflows/aiPipeline.ts
 * Orchestrates: Idea -> Research -> Hook -> [Script -> Rewrite ->
 * Storyboard -> Image Prompt -> Voice Script -> Subtitle -> Publish].
 *
 * Phase 3 implements Idea/Research/Hook end-to-end, including syncing
 * progress to the Notion dashboard. The remaining steps are wired as a
 * clear stop point -- running this today does real, useful work (an
 * idea gets picked, researched, hooked, and tracked in Notion) and then
 * tells you exactly which phase to build next, instead of crashing.
 */

import { getNextIdea } from "../content/ideaSource.js";
import { research } from "../content/research.js";
import { generateHook } from "../content/hook.js";
import { generateScript } from "../script/scriptGenerator.js";
import { updatePage, props } from "../notion/notionService.js";
import type { PipelineContext } from "./types.js";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function runAiPipeline(): Promise<PipelineContext> {
  console.log("1/4 Idea: جاري اختيار الفكرة...");
  const idea = await getNextIdea();
  console.log(`   -> ${idea.topic} (source: ${idea.source})`);

  console.log("2/4 Research: جاري تجميع الزاوية والحقائق...");
  const researchResult = await research(idea);

  console.log("3/4 Hook: جاري كتابة الجملة الافتتاحية...");
  const hook = await generateHook(researchResult);
  console.log(`   -> ${hook.text}`);

  console.log("4/4 Script: جاري كتابة السيناريو بالمشاهد...");
  const script = await generateScript(researchResult, hook);
  console.log(
    `   -> ${script.scenes.length} مشهد، إجمالي ~${script.totalDurationSec} ثانية`
  );

  if (idea.notionPageId) {
    // Keep the dashboard honest about progress even though later phases
    // (Storyboard -> ... -> Publish) aren't built yet.
    await updatePage(idea.notionPageId, {
      Caption: props.richText(hook.text),
    });
  }

  const context: PipelineContext = {
    idea,
    research: researchResult,
    hook,
    script,
  };

  const outDir = path.join(
    "output",
    new Date().toISOString().replace(/[:.]/g, "-")
  );
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "pipeline.json"),
    JSON.stringify(context, null, 2),
    "utf-8"
  );

  console.log(`\n✅ Idea/Research/Hook/Script جاهزين -- محفوظين في ${outDir}/pipeline.json`);
  console.log(
    "ℹ️  ده الـ pipeline الخفيف (محتوى بس، من غير صوت/فيديو/نشر).\n" +
      "   للتشغيل الكامل (Storyboard -> Voice -> Subtitle -> Video -> Publish) شغّل: npm run dev"
  );

  return context;
}
