/**
 * storyboard/storyboardEngine.ts
 * Deterministic (no AI call) mapping from Script scenes to Shots. Camera
 * movement and transitions cycle through a fixed rotation so consecutive
 * shots never repeat the same movement, and subtitle timing is derived
 * directly from cumulative scene durations.
 */

import type { Script } from "../script/types.js";
import type { Shot, Storyboard, CameraMovement, TransitionType } from "./types.js";

const CAMERA_ROTATION: CameraMovement[] = [
  "zoom-in",
  "pan-left",
  "zoom-out",
  "pan-right",
];

const TRANSITION_ROTATION: TransitionType[] = ["cross-fade", "blur", "cross-fade"];

export function buildStoryboard(script: Script): Storyboard {
  let cursorSec = 0;
  const shots: Shot[] = script.scenes.map((scene, i) => {
    const startSec = cursorSec;
    const endSec = cursorSec + scene.durationSec;
    cursorSec = endSec;

    const isLast = i === script.scenes.length - 1;

    return {
      sceneId: scene.id,
      durationSec: scene.durationSec,
      imagePrompt: scene.imagePrompt,
      cameraMovement: CAMERA_ROTATION[i % CAMERA_ROTATION.length],
      transitionToNext: isLast ? "cut" : TRANSITION_ROTATION[i % TRANSITION_ROTATION.length],
      // Ken Burns everywhere except the very first shot, which stays
      // static for half a beat so the hook lands before motion starts.
      animationType: i === 0 ? "fade" : "ken-burns",
      subtitle: {
        text: scene.narration,
        startSec,
        endSec,
      },
    };
  });

  return {
    topic: script.topic,
    shots,
    totalDurationSec: cursorSec,
  };
}
