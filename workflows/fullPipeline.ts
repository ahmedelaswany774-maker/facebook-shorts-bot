/**
 * workflows/fullPipeline.ts
 * The complete chain: Idea -> Research -> Hook -> Script -> Storyboard ->
 * Voice -> Subtitle -> Video -> Publish, syncing the Notion dashboard's
 * Status at every stage transition (Phase 10) and marking Failed with
 * the error message if any stage throws.
 */

import path from "node:path";
import { promises as fs } from "node:fs";

import { getNextIdea } from "../content/ideaSource.js";
import { research } from "../content/research.js";
import { generateHook } from "../content/hook.js";
import { generateScript } from "../script/scriptGenerator.js";
import { buildStoryboard } from "../storyboard/storyboardEngine.js";
import { generateVoice } from "../voice/voicePipeline.js";
import { buildCues } from "../subtitle/cueBuilder.js";
import { generateSRT } from "../subtitle/srtGenerator.js";
import { generateASS } from "../subtitle/assGenerator.js";
import { buildVideo } from "../video/ffmpegVideoBuilder.js";
import { PollinationsImageProvider, type ImageProvider } from "../image/imageProvider.js";
import { getConfiguredPublishers } from "../publish/index.js";
import { markStatus, markPublished, markFailed } from "../notion/dashboardSync.js";
import type { PipelineContext } from "./types.js";

export interface FullPipelineOptions {
  imageProvider?: ImageProvider;
  /** Skip actually calling Publisher.publish() (e.g. for a dry run / test). */
  skipPublish?: boolean;
}

export async function runFullPipeline(
  opts: FullPipelineOptions = {}
): Promise<PipelineContext> {
  const imageProvider = opts.imageProvider ?? new PollinationsImageProvider();

  const idea = await getNextIdea();
  const notionPageId = idea.notionPageId;

  const guard = async <T>(status: Parameters<typeof markStatus>[1], fn: () => Promise<T>): Promise<T> => {
    if (notionPageId) await markStatus(notionPageId, status);
    try {
      return await fn();
    } catch (err) {
      if (notionPageId) {
        await markFailed(notionPageId, err instanceof Error ? err.message : String(err));
      }
      throw err;
    }
  };

  const researchResult = await guard("Generating", () => research(idea));
  const hook = await generateHook(researchResult);
  const script = await generateScript(researchResult, hook);
  const storyboard = buildStoryboard(script);

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join("output", runId);
  await fs.mkdir(outDir, { recursive: true });

  const voice = await guard("Voice", () => generateVoice(script, path.join(outDir, "voice")));

  const cues = buildCues(storyboard);
  const srtPath = path.join(outDir, "subtitles.srt");
  const assPath = path.join(outDir, "subtitles.ass");
  await fs.writeFile(srtPath, generateSRT(cues), "utf-8");
  await fs.writeFile(assPath, generateASS(cues), "utf-8");

  const video = await guard("Video", async () => {
    const imagesDir = path.join(outDir, "images");
    await fs.mkdir(imagesDir, { recursive: true });
    const imagePaths: string[] = [];
    for (const shot of storyboard.shots) {
      const imgPath = path.join(imagesDir, `shot-${shot.sceneId}.jpg`);
      await imageProvider.generate(shot.imagePrompt, imgPath);
      imagePaths.push(imgPath);
    }
    return buildVideo(storyboard.shots, {
      imagePaths,
      voiceAudioPath: voice.fullAudioPath,
      subtitleAssPath: assPath,
      outPath: path.join(outDir, "final.mp4"),
    });
  });

  let publish: PipelineContext["publish"];
  if (!opts.skipPublish) {
    publish = await guard("Publishing", async () => {
      const publishers = getConfiguredPublishers();
      const results = [];
      for (const publisher of publishers) {
        results.push(await publisher.publish(video.path, hook.text));
      }
      return results;
    });
    if (notionPageId && publish && publish.length > 0) {
      await markPublished(notionPageId, publish);
    }
  }

  return {
    idea,
    research: researchResult,
    hook,
    script,
    storyboard,
    voice,
    subtitle: { srtPath, assPath },
    video,
    publish,
  };
}
