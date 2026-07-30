/**
 * prompts/hook.prompt.ts
 */
export function buildHookPrompt(topic: string, angle: string): string {
  return [
    `الموضوع: ${topic}`,
    `الزاوية: ${angle}`,
    "اكتب جملة افتتاحية واحدة قوية (Hook) بالعربية، الهدف إنها توقف السكرول في أول ثانيتين.",
    "ماتكتبش أي حاجة تانية غير الجملة نفسها، من غير علامات تنصيص وبدون Markdown.",
  ].join("\n");
}
