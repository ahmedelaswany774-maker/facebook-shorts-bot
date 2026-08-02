/**
 * voice/sentenceSplitter.ts
 * Splits Arabic narration into sentence-sized chunks for per-sentence
 * TTS synthesis. Pure function, no I/O -- easy to unit test.
 */

const SENTENCE_ENDERS = /(?<=[.!؟?])\s+/;

export function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_ENDERS)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
