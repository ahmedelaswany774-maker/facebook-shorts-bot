/**
 * prompts/idea.prompt.ts
 * Used only when there's no queued topic waiting in Notion.
 */
export function buildIdeaPrompt(): string {
  return [
    "أنت مسؤول اختيار أفكار محتوى عربي لفيديوهات قصيرة (Reels/Shorts) مدتها حوالي 3 دقائق.",
    "اقترح فكرة واحدة فقط، مثيرة للاهتمام (قصة إنسانية، معلومة غريبة، أو حدث تاريخي غير معروف).",
    "أرجع الرد بصيغة JSON فقط بدون أي نص إضافي وبدون Markdown fences، بالشكل:",
    `{"topic": "عنوان الفكرة في جملة واحدة قصيرة"}`,
  ].join("\n");
}
