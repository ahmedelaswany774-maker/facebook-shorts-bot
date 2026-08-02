/**
 * subtitle/srtGenerator.ts
 * Pure formatter: SubtitleCue[] -> .srt file content.
 */
import type { SubtitleCue } from "./types.js";

function formatTimestamp(sec: number): string {
  const ms = Math.round((sec % 1) * 1000);
  const totalSec = Math.floor(sec);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function generateSRT(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue) =>
        `${cue.index}\n${formatTimestamp(cue.startSec)} --> ${formatTimestamp(cue.endSec)}\n${cue.text}\n`
    )
    .join("\n");
}
