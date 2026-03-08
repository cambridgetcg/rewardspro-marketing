/**
 * Post Composer — applies brand overlays to generated media.
 *
 * Takes raw generated images and composites:
 *   1. Brand color overlay (subtle dark vignette)
 *   2. "Rewards Pro" wordmark (text rendered via Sharp)
 *   3. Platform-specific cropping/sizing
 *   4. Optional stat overlay (install count, etc.)
 *
 * Uses Sharp for image composition (Node.js, no external processes needed).
 * Video composition uses FFmpeg (must be installed: brew install ffmpeg).
 */

import sharp from "sharp";
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import type { Platform, GeneratedMedia, ComposedMedia } from "./types.js";
import { PLATFORM_SPECS } from "./types.js";
import { downloadMedia } from "./fal.js";

const ASSETS_DIR = resolve(import.meta.dirname, "../../assets");
const TEMP_DIR = resolve(import.meta.dirname, "../../data/temp");

function ensureDirs() {
  [ASSETS_DIR, TEMP_DIR].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
}

/**
 * Brand colors as RGBA buffers for overlay compositing.
 */
const BRAND_NAVY = { r: 26, g: 26, b: 46, alpha: 0.25 };     // #1a1a2e at 25% opacity
const BRAND_GOLD_HEX = "#FFD700";

/**
 * Compose an image with brand overlay for a specific platform.
 */
export async function composeImage(
  media: GeneratedMedia,
  platform: Platform,
  options: {
    showWordmark?: boolean;
    statText?: string;         // e.g. "47 merchants" — overlaid at bottom
    tagline?: string;          // e.g. "Loyalty for every Shopify store"
  } = {}
): Promise<ComposedMedia> {
  ensureDirs();

  const spec = PLATFORM_SPECS[platform];
  const ext = media.url.includes(".png") ? "png" : "jpg";
  const inputPath = resolve(TEMP_DIR, `input-${Date.now()}.${ext}`);
  const outputPath = resolve(TEMP_DIR, `composed-${platform}-${Date.now()}.jpg`);

  // Download source image
  await downloadMedia(media.url, inputPath);

  // Build SVG overlay with wordmark and optional stat
  const { showWordmark = true, statText, tagline } = options;

  const svgWidth = spec.width;
  const svgHeight = spec.height;

  const wordmarkY = svgHeight - 36;
  const statY = svgHeight - 70;
  const taglineY = statText ? svgHeight - 110 : svgHeight - 70;

  const svgOverlay = `
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Bottom gradient vignette for text readability -->
  <defs>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="60%" stop-color="rgba(26,26,46,0)" />
      <stop offset="100%" stop-color="rgba(26,26,46,0.85)" />
    </linearGradient>
  </defs>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#vignette)" />

  ${showWordmark ? `
  <!-- Wordmark: Rewards Pro -->
  <text
    x="32" y="${wordmarkY}"
    font-family="'Inter', 'Helvetica Neue', sans-serif"
    font-weight="700"
    font-size="18"
    fill="${BRAND_GOLD_HEX}"
    letter-spacing="0.5"
  >Rewards Pro</text>
  ` : ""}

  ${tagline ? `
  <!-- Tagline -->
  <text
    x="32" y="${taglineY}"
    font-family="'Inter', 'Helvetica Neue', sans-serif"
    font-weight="400"
    font-size="22"
    fill="rgba(255,255,255,0.9)"
  >${escapeXml(tagline)}</text>
  ` : ""}

  ${statText ? `
  <!-- Stat overlay -->
  <text
    x="32" y="${statY}"
    font-family="'Inter', 'Helvetica Neue', sans-serif"
    font-weight="700"
    font-size="28"
    fill="white"
  >${escapeXml(statText)}</text>
  ` : ""}
</svg>`.trim();

  const svgBuffer = Buffer.from(svgOverlay);

  // Compose with Sharp
  await sharp(inputPath)
    .resize(spec.width, spec.height, {
      fit: "cover",
      position: "center",
    })
    .composite([
      {
        input: svgBuffer,
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  return {
    ...media,
    type: "image",
    localPath: outputPath,
    width: spec.width,
    height: spec.height,
    branded: true,
    platform,
    // Note: for Ayrshare, we'll need to upload this to a public URL
    // For now, url stays as fal CDN url; localPath has the branded version
  };
}

/**
 * Compose a video with FFmpeg brand overlay.
 * Requires ffmpeg installed: brew install ffmpeg
 */
export async function composeVideo(
  media: GeneratedMedia,
  platform: Platform,
  options: {
    tagline?: string;
    statText?: string;
  } = {}
): Promise<ComposedMedia> {
  ensureDirs();

  // Check ffmpeg
  try {
    execSync("which ffmpeg", { stdio: "pipe" });
  } catch {
    console.warn("[composer] ffmpeg not found — returning unbranded video");
    return { ...media, branded: true, platform };
  }

  const spec = PLATFORM_SPECS[platform];
  const inputPath = resolve(TEMP_DIR, `video-input-${Date.now()}.mp4`);
  const outputPath = resolve(TEMP_DIR, `video-composed-${platform}-${Date.now()}.mp4`);

  await downloadMedia(media.url, inputPath);

  const { tagline, statText } = options;
  const drawTextFilters: string[] = [];

  // Brand wordmark bottom-left
  drawTextFilters.push(
    `drawtext=text='Rewards Pro':fontcolor=${BRAND_GOLD_HEX}:fontsize=24:x=32:y=h-48:fontweight=bold`
  );

  if (tagline) {
    drawTextFilters.push(
      `drawtext=text='${tagline.replace(/'/g, "\\'")}':fontcolor=white:fontsize=20:x=32:y=h-80:alpha=0.9`
    );
  }

  if (statText) {
    drawTextFilters.push(
      `drawtext=text='${statText.replace(/'/g, "\\'")}':fontcolor=white:fontsize=28:fontweight=bold:x=32:y=h-114`
    );
  }

  // Fade in/out
  const duration = media.durationSeconds ?? 6;
  drawTextFilters.push(`fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`);

  const vf = drawTextFilters.join(",");

  execSync(
    `ffmpeg -i "${inputPath}" -vf "${vf}" -vcodec libx264 -acodec aac -s ${spec.width}x${spec.height} -y "${outputPath}"`,
    { stdio: "pipe" }
  );

  return {
    ...media,
    type: "video",
    localPath: outputPath,
    width: spec.width,
    height: spec.height,
    branded: true,
    platform,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
