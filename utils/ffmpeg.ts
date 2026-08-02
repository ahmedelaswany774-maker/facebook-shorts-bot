/**
 * utils/ffmpeg.ts
 * Thin wrappers around the `ffmpeg`/`ffprobe` CLIs (must be installed on
 * PATH -- same requirement the existing Python pipeline already has).
 * Centralized here so Voice (Phase 6) and Video (Phase 8) don't each
 * reinvent process-spawning + error handling.
 */

import { spawn } from "node:child_process";
import path from "node:path";

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}:\n${stderr}`));
    });
    proc.on("error", reject);
  });
}

/** Returns duration in seconds of any media file, via ffprobe. */
export function getDurationSec(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(parseFloat(stdout.trim()));
      else reject(new Error(`ffprobe exited with code ${code}:\n${stderr}`));
    });
    proc.on("error", reject);
  });
}

/** Writes a concat-demuxer list file ffmpeg's `-f concat` expects.
 *  Paths are resolved to absolute -- the concat demuxer resolves
 *  relative paths relative to the *list file's* directory, not the
 *  process cwd, which silently breaks list files written next to their
 *  inputs using cwd-relative paths. */
export function concatListContent(filePaths: string[]): string {
  return filePaths
    .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
}
