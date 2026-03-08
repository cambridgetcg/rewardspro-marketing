/**
 * Brand-consistent generation prompts for Rewards Pro content.
 *
 * Brand identity:
 *   - Primary: deep navy #1a1a2e
 *   - Accent: gold #FFD700
 *   - Style: clean, minimal, modern SaaS
 *   - Feel: professional but warm — not cold enterprise
 *
 * Rules:
 *   - Never include text/words in image prompts (unreliable from generators)
 *   - Text is composited on top via Sharp
 *   - Always specify "no text, no words, no letters" in prompt
 *   - Negative prompt always suppresses: ugly, low quality, watermark, text, words
 */

import type { ContentStyle, AspectRatio } from "./types.js";

const BRAND_SUFFIX = `
Professional product marketing photography. Deep navy and gold color palette.
Clean, minimal, modern SaaS aesthetic. High quality, 8k resolution.
No text, no words, no letters, no numbers, no watermark.
Photorealistic product marketing style.
`.trim();

const NEGATIVE = "ugly, blurry, low quality, watermark, text, words, letters, numbers, logo, pixelated, distorted, noise";

export interface ImagePrompt {
  prompt: string;
  negative: string;
  style: string;
}

export interface VideoPrompt {
  prompt: string;
  negative: string;
  durationSeconds: number;
}

/**
 * Generate an image prompt for a given content style.
 */
export function imagePromptFor(
  style: ContentStyle,
  installCount: number,
  _aspectRatio: AspectRatio
): ImagePrompt {
  const base: Record<ContentStyle, string> = {
    "feature-card": `
      Abstract visualization of a loyalty rewards dashboard interface.
      Glowing UI elements, floating reward icons (stars, coins, crowns, gift boxes).
      Deep navy background with gold accent lighting. Smooth gradients.
      Clean dashboard wireframe aesthetic, soft glow effects.
      ${BRAND_SUFFIX}
    `,
    "social-proof": `
      Abstract network of interconnected store/merchant nodes glowing in gold.
      ${installCount > 50 ? `Dense, thriving network suggesting scale and community.` : `Small but growing network of nodes, suggesting momentum.`}
      Deep space-like navy background with golden constellation points.
      Organic, warm connection lines. No logos. Abstract merchant ecosystem.
      ${BRAND_SUFFIX}
    `,
    "milestone": `
      Celebratory abstract burst of light. Golden particles and confetti-like elements
      radiating outward from a central glowing point. Deep navy background.
      Triumphant, upward energy. Bokeh golden light effects.
      ${BRAND_SUFFIX}
    `,
    "testimonial": `
      Warm, minimal abstract background for a quote card.
      Subtle golden geometric shapes on deep navy. Clean gradient from navy to slightly lighter navy.
      Elegant, professional. Space for text overlay at center-left.
      Low contrast, sophisticated. Think high-end brand testimonial background.
      ${BRAND_SUFFIX}
    `,
    "offer": `
      Premium gift/reward visualization. Elegant gift box with gold ribbon on navy background.
      Soft golden glow emanating from the box. Luxury product launch aesthetic.
      Sparkle and light ray effects. High-end ecommerce brand feel.
      ${BRAND_SUFFIX}
    `,
    "comparison": `
      Clean split composition: two abstract zones separated by a subtle gold line.
      Left side: muted, grey-blue cold tones (suggesting competitors, complexity, cost).
      Right side: warm gold and navy (suggesting Rewards Pro, simplicity, value).
      Minimal abstract shapes. No icons or text.
      ${BRAND_SUFFIX}
    `,
    "demo": `
      Cinematic product showcase: modern ecommerce loyalty dashboard interface floating
      in a dark navy void. Gold accent highlights on key interface elements.
      Depth of field blur on edges. Hero product shot aesthetic.
      Clean monitor/screen perspective. Premium software showcase.
      ${BRAND_SUFFIX}
    `,
  };

  return {
    prompt: base[style].trim(),
    negative: NEGATIVE,
    style: "realistic",
  };
}

/**
 * Generate a video prompt for short promotional clips.
 */
export function videoPromptFor(style: ContentStyle, installCount: number): VideoPrompt {
  const prompts: Record<ContentStyle, string> = {
    "feature-card": `
      Smooth animated loyalty rewards dashboard. Gold coins and star icons gently float upward.
      Dark navy background with subtle particle effects. Sleek UI elements slide in from left.
      Professional SaaS product demo animation. Looping. 5 seconds.
    `,
    "social-proof": `
      Golden nodes appear one by one on a dark navy map, connecting with glowing lines.
      Each node pulse when it connects. Represents merchants joining a network.
      Cinematic camera slowly zooms out revealing the full constellation. 8 seconds.
    `,
    "milestone": `
      Celebratory particle burst in gold and white on deep navy background.
      Numbers (stylized, abstract) cascade upward. Confetti-like elements.
      Triumphant energy, upward motion. 6 seconds.
    `,
    "testimonial": `
      Gentle animated background: soft gold bokeh lights slowly drifting on navy.
      Subtle gradient animation. Calm, professional. Space for text.
      Looping. 8 seconds.
    `,
    "offer": `
      Gift box with gold ribbon slowly unwraps to reveal golden light burst.
      Particles and sparkles emerge. Premium luxury brand reveal animation.
      8 seconds with dramatic pause at reveal.
    `,
    "comparison": `
      Split screen animation: left side grey and chaotic, right side transforms to clean gold and navy.
      The transformation is smooth and satisfying. 6 seconds.
    `,
    "demo": `
      Smooth cinematic zoom into a Shopify loyalty dashboard UI.
      Cashback percentage, tier progress bar, and reward history animate in sequence.
      Satisfying UI micro-animations. Dark theme. 10 seconds.
    `,
  };

  return {
    prompt: prompts[style].trim(),
    negative: "low quality, blurry, jerky, watermark, text, words",
    durationSeconds: style === "demo" ? 10 : style === "social-proof" ? 8 : 6,
  };
}
