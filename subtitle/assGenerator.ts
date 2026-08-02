/**
 * subtitle/assGenerator.ts
 * Pure formatter: SubtitleCue[] -> .ass file content, with a per-line
 * fade-in/out animation tag so it's ready to burn in with FFmpeg's
 * `ass` filter without any extra styling step.
 */
import type { SubtitleCue } from "./types.js";

export interface AssStyleOptions {
  fontName?: string;
  fontSize?: number;
  /** &HAABBGGRR ASS color, primary (fill) color. Default: white. */
  primaryColor?: string;
  /** Fade in/out duration in ms, applied per line via \fad(). */
  fadeMs?: number;
  /** Vertical position (1080x1920 canvas): distance from the bottom, in px. */
  marginBottom?: number;
}

function formatAssTimestamp(sec: number): string {
  const cs = Math.round((sec % 1) * 100); // centiseconds
  const totalSec = Math.floor(sec);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export function generateASS(cues: SubtitleCue[], opts: AssStyleOptions = {}): string {
  const {
    fontName = "Arial",
    fontSize = 64,
    primaryColor = "&H00FFFFFF",
    fadeMs = 200,
    marginBottom = 220,
  } = opts;

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV",
    `Style: Default,${fontName},${fontSize},${primaryColor},&H00000000,&H64000000,1,3,1,2,60,60,${marginBottom}`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const lines = cues.map((cue) => {
    const text = cue.text.replace(/\n/g, "\\N");
    return `Dialogue: 0,${formatAssTimestamp(cue.startSec)},${formatAssTimestamp(cue.endSec)},Default,,0,0,0,,{\\fad(${fadeMs},${fadeMs})}${text}`;
  });

  return `${header}\n${lines.join("\n")}\n`;
}
