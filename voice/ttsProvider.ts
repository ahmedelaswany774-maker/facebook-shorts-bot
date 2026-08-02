/**
 * voice/ttsProvider.ts
 * Provider interface so a paid TTS service can be swapped in later
 * without touching the voice pipeline. Default implementation is the
 * same free endpoint the Python `gTTS` library wraps (Google Translate's
 * TTS), called directly -- no paid API key required.
 */

import { promises as fs } from "node:fs";

export interface TTSProvider {
  /** Synthesizes `text` (already <= ~200 chars) to an mp3 file at `outPath`. */
  synthesize(text: string, outPath: string, lang?: string): Promise<void>;
}

const TTS_ENDPOINT = "https://translate.google.com/translate_tts";
const MAX_CHUNK = 200; // matches gTTS's own safe chunk size

export class GoogleTranslateTTSProvider implements TTSProvider {
  async synthesize(text: string, outPath: string, lang = "ar"): Promise<void> {
    if (text.length > MAX_CHUNK) {
      throw new Error(
        `GoogleTranslateTTSProvider: text chunk too long (${text.length} > ${MAX_CHUNK}). ` +
          `Split with sentenceSplitter first.`
      );
    }
    const url = `${TTS_ENDPOINT}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      throw new Error(`TTS request failed: ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
  }
}
