/**
 * Shared types for the content generation pipeline.
 */

export type Platform = "twitter" | "linkedin" | "instagram" | "facebook" | "threads" | "bluesky" | "tiktok";
export type MediaType = "image" | "video" | "gif";
export type ContentStyle = "feature-card" | "social-proof" | "milestone" | "testimonial" | "offer" | "comparison" | "demo";
export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:5" | "1.91:1";

export interface PlatformSpec {
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  preferVideo: boolean;
  maxVideoSeconds: number;
}

export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  twitter:   { aspectRatio: "16:9",   width: 1200, height: 675,  preferVideo: false, maxVideoSeconds: 140 },
  linkedin:  { aspectRatio: "1.91:1", width: 1200, height: 628,  preferVideo: false, maxVideoSeconds: 600 },
  instagram: { aspectRatio: "1:1",    width: 1080, height: 1080, preferVideo: true,  maxVideoSeconds: 60  },
  facebook:  { aspectRatio: "1.91:1", width: 1200, height: 628,  preferVideo: true,  maxVideoSeconds: 240 },
  threads:   { aspectRatio: "1:1",    width: 1080, height: 1080, preferVideo: false, maxVideoSeconds: 300 },
  bluesky:   { aspectRatio: "16:9",   width: 1200, height: 675,  preferVideo: false, maxVideoSeconds: 60  },
  tiktok:    { aspectRatio: "9:16",   width: 1080, height: 1920, preferVideo: true,  maxVideoSeconds: 60  },
};

export interface MediaBrief {
  style: ContentStyle;
  platform: Platform;
  waveId: number;
  installCount: number;
  prompt?: string;            // Override auto-generated prompt
  preferVideo: boolean;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
}

export interface GeneratedMedia {
  type: MediaType;
  url: string;                // Public URL (from fal.ai CDN or uploaded)
  localPath?: string;         // Local file path after download
  width: number;
  height: number;
  durationSeconds?: number;   // Video only
  model: string;
  cost?: number;              // Estimated cost in USD
  generatedAt: string;
}

export interface ComposedMedia extends GeneratedMedia {
  branded: true;              // Has logo/brand overlay applied
  platform: Platform;
}

export interface ContentPackage {
  postText: string;
  hashtags: string[];
  media: ComposedMedia[];     // One per target platform
  wave: number;
  style: ContentStyle;
  generatedAt: string;
}
