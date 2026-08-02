import assert from "node:assert";
import { generateSRT } from "./srtGenerator.js";
import { generateASS } from "./assGenerator.js";
import { buildCues } from "./cueBuilder.js";
import type { Storyboard } from "../storyboard/types.js";

const cues = [
  { index: 1, startSec: 0, endSec: 2.5, text: "أول جملة" },
  { index: 2, startSec: 2.5, endSec: 6, text: "جملة تانية" },
];

const srt = generateSRT(cues);
assert.ok(srt.includes("00:00:00,000 --> 00:00:02,500"));
assert.ok(srt.includes("00:00:02,500 --> 00:00:06,000"));
assert.ok(srt.includes("أول جملة"));

const ass = generateASS(cues);
assert.ok(ass.includes("[Script Info]"));
assert.ok(ass.includes("[Events]"));
assert.ok(ass.includes("\\fad(200,200)"));
assert.ok(ass.includes("0:00:00.00,0:00:02.50"));

const storyboard: Storyboard = {
  topic: "t",
  shots: [
    {
      sceneId: 1,
      durationSec: 3,
      imagePrompt: "x",
      cameraMovement: "zoom-in",
      transitionToNext: "cross-fade",
      animationType: "ken-burns",
      subtitle: { text: "شوت واحد", startSec: 0, endSec: 3 },
    },
  ],
  totalDurationSec: 3,
};
const builtCues = buildCues(storyboard);
assert.strictEqual(builtCues.length, 1);
assert.strictEqual(builtCues[0].text, "شوت واحد");

console.log("✅ subtitle generators: all checks passed");
