/**
 * storyboard/types.ts
 * One Shot per Script Scene: adds camera movement, transition into the
 * next shot, animation type, and subtitle timing -- everything the
 * Video Builder (Phase 8) needs, computed deterministically so this
 * step needs no AI call and is fully unit-testable.
 */

export type CameraMovement = "static" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
export type TransitionType = "cut" | "cross-fade" | "blur";
export type AnimationType = "ken-burns" | "fade" | "none";

export interface Shot {
  sceneId: number;
  durationSec: number;
  imagePrompt: string;
  cameraMovement: CameraMovement;
  /** Transition used going INTO the next shot (last shot's is "cut"). */
  transitionToNext: TransitionType;
  animationType: AnimationType;
  subtitle: {
    text: string;
    startSec: number;
    endSec: number;
  };
}

export interface Storyboard {
  topic: string;
  shots: Shot[];
  totalDurationSec: number;
}
