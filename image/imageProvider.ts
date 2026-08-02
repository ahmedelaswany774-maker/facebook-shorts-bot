/**
 * image/imageProvider.ts
 * Provider interface (swap in a paid model later without touching
 * callers) + the same free Pollinations.ai endpoint the existing Python
 * pipeline already uses.
 */
import { promises as fs } from "node:fs";

export interface ImageProvider {
  generate(prompt: string, outPath: string, width?: number, height?: number): Promise<void>;
}

export class PollinationsImageProvider implements ImageProvider {
  async generate(prompt: string, outPath: string, width = 1080, height = 1920): Promise<void> {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt.slice(0, 200)
    )}?width=${width}&height=${height}&nologo=true`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Pollinations image request failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
  }
}
