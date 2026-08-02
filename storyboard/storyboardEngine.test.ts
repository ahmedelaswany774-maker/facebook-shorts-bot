/**
 * storyboard/storyboardEngine.test.ts
 * Fully deterministic -- no network, no mocks needed.
 */
import assert from "node:assert";
import { buildStoryboard } from "./storyboardEngine.js";
import type { Script } from "../script/types.js";

const script: Script = {
  topic: "test topic",
  scenes: [
    { id: 1, durationSec: 5, narration: "one", imagePrompt: "img1" },
    { id: 2, durationSec: 7, narration: "two", imagePrompt: "img2" },
    { id: 3, durationSec: 4, narration: "three", imagePrompt: "img3" },
  ],
  totalDurationSec: 16,
  fullNarration: "one two three",
};

const board = buildStoryboard(script);

assert.strictEqual(board.shots.length, 3);
assert.strictEqual(board.totalDurationSec, 16);

// subtitle timing is cumulative
assert.strictEqual(board.shots[0].subtitle.startSec, 0);
assert.strictEqual(board.shots[0].subtitle.endSec, 5);
assert.strictEqual(board.shots[1].subtitle.startSec, 5);
assert.strictEqual(board.shots[1].subtitle.endSec, 12);
assert.strictEqual(board.shots[2].subtitle.startSec, 12);
assert.strictEqual(board.shots[2].subtitle.endSec, 16);

// last shot never transitions to a "next" shot
assert.strictEqual(board.shots[2].transitionToNext, "cut");

// first shot doesn't ken-burns (holds for the hook)
assert.strictEqual(board.shots[0].animationType, "fade");
assert.strictEqual(board.shots[1].animationType, "ken-burns");

console.log("✅ storyboardEngine: all checks passed");
