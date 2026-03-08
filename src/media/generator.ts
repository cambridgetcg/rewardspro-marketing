/**
 * Content Generator — orchestrates the full media pipeline.
 *
 * Given a post template and wave context, produces a complete ContentPackage:
 * text + platform-specific branded images or videos.
 *
 * Flow:
 *   1. Derive ContentStyle from post template tags
 *   2. Build MediaBrief per target platform
 *   3. Generate base image or video (fal.ai)
 *   4. Compose with brand overlay (Sharp / FFmpeg)
 *   5. Return ContentPackage ready for Ayrshare
 */

import type { ContentStyle, Platform, ContentPackage, ComposedMedia } from "./types.js";
import { PLATFORM_SPECS } from "./types.js";
import { imagePromptFor, videoPromptFor } from "./prompts.js";
import { generateImage, generateVideo } from "./fal.js";
import { composeImage, composeVideo } from "./composer.js";
import type { PostTemplate } from "../content/library.js";
import { SUBSTITUTIONS } from "../content/library.js";

/**
 * Map post tags → content style for prompt generation.
 */
function styleFromTags(tags: string[]): ContentStyle {
  if (tags.includes("milestone"))    return "milestone";
  if (tags.includes("testimonial"))  return "testimonial";
  if (tags.includes("review-ask") || tags.includes("offer")) return "offer";
  if (tags.includes("comparison"))   return "comparison";
  if (tags.includes("social-proof") || tags.includes("stats")) return "social-proof";
  if (tags.includes("use-case"))     return "demo";
  return "feature-card";
}

/**
 * Determine if this post should have a video instead of an image.
 * Videos are reserved for Instagram and TikTok in Wave 2+.
 */
function shouldGenerateVideo(platform: Platform, waveId: number): boolean {
  return waveId >= 2 && (platform === "instagram" || platform === "tiktok");
}

export interface GeneratorOptions {
  post: PostTemplate;
  variantIndex: number;
  waveId: number;
  installCount: number;
  targetPlatforms: Platform[];
  draft?: boolean;                  // Use cheaper/faster draft models
  textOnly?: boolean;               // Skip media generation entirely
}

/**
 * Generate a full content package for a post.
 */
export async function generateContentPackage(
  options: GeneratorOptions
): Promise<ContentPackage> {
  const { post, variantIndex, waveId, installCount, targetPlatforms, draft = false, textOnly = false } = options;

  // Build post text with substitutions
  let text = post.variants[variantIndex % post.variants.length];
  text = text
    .replace(/\{INSTALL_COUNT\}/g, installCount.toString())
    .replace(/\{MERCHANT_COUNT\}/g, installCount.toString())
    .replace(/\{APP_URL\}/g, SUBSTITUTIONS.APP_URL)
    .replace(/\{REVIEW_URL\}/g, SUBSTITUTIONS.REVIEW_URL);

  const style = styleFromTags(post.tags);

  if (textOnly || !process.env.FAL_API_KEY) {
    return {
      postText: text,
      hashtags: post.hashtags ?? [],
      media: [],
      wave: waveId,
      style,
      generatedAt: new Date().toISOString(),
    };
  }

  // Generate media for each platform
  const mediaResults: ComposedMedia[] = [];
  const generated = new Map<string, any>(); // cache base generation

  for (const platform of targetPlatforms) {
    const spec = PLATFORM_SPECS[platform];
    const useVideo = shouldGenerateVideo(platform, waveId);
    const cacheKey = `${useVideo ? "video" : "image"}-${spec.aspectRatio}`;

    try {
      let composed: ComposedMedia;

      if (useVideo) {
        // Generate or reuse video
        let baseMedia = generated.get(cacheKey);
        if (!baseMedia) {
          console.log(`  [generator] Generating video for ${platform} (${spec.aspectRatio})...`);
          const vp = videoPromptFor(style, installCount);
          baseMedia = await generateVideo(vp.prompt, vp.negative, vp.durationSeconds, spec.aspectRatio);
          generated.set(cacheKey, baseMedia);
        }
        composed = await composeVideo(baseMedia, platform, {
          tagline: post.mediaHint,
          statText: post.tags.includes("stats") ? `${installCount} merchants` : undefined,
        });
      } else {
        // Generate or reuse image
        let baseMedia = generated.get(cacheKey);
        if (!baseMedia) {
          console.log(`  [generator] Generating image for ${platform} (${spec.aspectRatio})...`);
          const ip = imagePromptFor(style, installCount, spec.aspectRatio);
          baseMedia = await generateImage(ip.prompt, ip.negative, spec.aspectRatio, draft);
          generated.set(cacheKey, baseMedia);
        }
        composed = await composeImage(baseMedia, platform, {
          showWordmark: true,
          statText: post.tags.includes("stats") || post.tags.includes("milestone")
            ? `${installCount} merchants`
            : undefined,
          tagline: post.mediaHint?.slice(0, 60),
        });
      }

      mediaResults.push(composed);
    } catch (err: any) {
      console.error(`  [generator] Media generation failed for ${platform}:`, err.message);
      // Continue — text-only for this platform
    }
  }

  return {
    postText: text,
    hashtags: post.hashtags ?? [],
    media: mediaResults,
    wave: waveId,
    style,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Quick generate a single branded image for a platform.
 * Use for manual content creation or testing.
 */
export async function quickImage(
  style: ContentStyle,
  platform: Platform,
  installCount: number,
  draft = true
): Promise<ComposedMedia> {
  const spec = PLATFORM_SPECS[platform];
  const ip = imagePromptFor(style, installCount, spec.aspectRatio);
  const base = await generateImage(ip.prompt, ip.negative, spec.aspectRatio, draft);
  return composeImage(base, platform, { showWordmark: true });
}
