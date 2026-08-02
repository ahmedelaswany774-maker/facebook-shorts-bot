/**
 * publish/types.ts
 * A common interface so Facebook Page and YouTube publishing are
 * interchangeable to the pipeline -- neither requires a paid API.
 */

export interface PublishResult {
  platform: "facebook" | "youtube";
  id: string;
  url?: string;
}

export interface Publisher {
  readonly platform: PublishResult["platform"];
  publish(videoPath: string, caption: string): Promise<PublishResult>;
}
