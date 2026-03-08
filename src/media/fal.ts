/**
 * Fal.ai API Client — Image & Video Generation
 *
 * Models used:
 *   Images: fal-ai/flux-pro/v1.1        (~$0.04/image, high quality)
 *           fal-ai/flux/schnell           (~$0.003/image, fast drafts)
 *   Videos: fal-ai/kling-video/v1.6/standard  (~$0.35/5s clip)
 *           fal-ai/minimax-video          (~$0.28/6s clip)
 *
 * Docs: https://docs.fal.ai
 */

import { fal } from "@fal-ai/client";
import { createWriteStream } from "fs";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { GeneratedMedia, AspectRatio } from "./types.js";

// Configure fal client
export function initFal() {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error("FAL_API_KEY not set");
  fal.config({ credentials: key });
}

const ASPECT_MAP: Record<AspectRatio, string> = {
  "1:1":    "square_hd",
  "16:9":   "landscape_16_9",
  "9:16":   "portrait_16_9",
  "4:5":    "portrait_4_5",
  "1.91:1": "landscape_16_9",   // closest available
};

/**
 * Generate an image using Flux Pro 1.1.
 * Use schnell model for drafts (faster, cheaper).
 */
export async function generateImage(
  prompt: string,
  negative: string,
  aspectRatio: AspectRatio,
  draft = false
): Promise<GeneratedMedia> {
  initFal();

  const model = draft
    ? "fal-ai/flux/schnell"
    : "fal-ai/flux-pro/v1.1";

  const result = await fal.run(model, {
    input: {
      prompt,
      negative_prompt: negative,
      image_size: ASPECT_MAP[aspectRatio] ?? "landscape_16_9",
      num_inference_steps: draft ? 4 : 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
    },
  }) as any;

  const imageUrl = result.images?.[0]?.url ?? result.image?.url;
  if (!imageUrl) throw new Error(`No image URL in fal response: ${JSON.stringify(result)}`);

  return {
    type: "image",
    url: imageUrl,
    width: result.images?.[0]?.width ?? 1200,
    height: result.images?.[0]?.height ?? 675,
    model,
    cost: draft ? 0.003 : 0.04,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a short video using Kling v1.6.
 * Falls back to minimax-video if kling fails.
 */
export async function generateVideo(
  prompt: string,
  negative: string,
  durationSeconds: number,
  aspectRatio: AspectRatio = "16:9"
): Promise<GeneratedMedia> {
  initFal();

  const model = "fal-ai/kling-video/v1.6/standard/text-to-video";
  const aspect = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";

  let result: any;
  try {
    result = await fal.run(model, {
      input: {
        prompt,
        negative_prompt: negative,
        duration: durationSeconds <= 5 ? "5" : "10",
        aspect_ratio: aspect,
        cfg_scale: 0.5,
      },
    });
  } catch (err) {
    console.warn("[fal] kling failed, falling back to minimax:", err);
    result = await fal.run("fal-ai/minimax-video/image-to-video", {
      input: {
        prompt,
        duration: 6,
      },
    });
  }

  const videoUrl = result.video?.url ?? result.videos?.[0]?.url;
  if (!videoUrl) throw new Error(`No video URL in fal response`);

  return {
    type: "video",
    url: videoUrl,
    width: aspectRatio === "9:16" ? 1080 : 1280,
    height: aspectRatio === "9:16" ? 1920 : 720,
    durationSeconds,
    model,
    cost: durationSeconds <= 5 ? 0.35 : 0.70,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Download a generated media file to a local path.
 */
export async function downloadMedia(url: string, destPath: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const body = response.body;
  if (!body) throw new Error("Empty response body");
  const dest = createWriteStream(destPath);
  await pipeline(Readable.fromWeb(body as any), dest);
  return destPath;
}
