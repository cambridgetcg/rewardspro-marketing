/**
 * Content Library — the full post template catalogue.
 *
 * Each post has:
 * - tags: matched against wave.contentTags to select appropriate posts
 * - channels: which platforms it's written for (tone differs)
 * - template: the post text, with {variables} for substitution
 * - variants: A/B rotation variants
 * - media: optional image description (agent fetches/generates)
 *
 * Variables:
 *   {INSTALL_COUNT}  — current total installs
 *   {MERCHANT_COUNT} — synonym for installs (friendly)
 *   {APP_URL}        — https://apps.shopify.com/rewards-pro
 *   {REVIEW_URL}     — App Store review link
 *   {THIS_WEEK}      — week number or date
 */

export interface PostTemplate {
  id: string;
  tags: string[];
  channels: string[];       // "twitter" | "linkedin" | "instagram" | "threads" | "bluesky" | "facebook"
  wave: number[];           // Which waves can use this post
  variants: string[];       // Rotate through these to avoid repetition
  hashtags?: string[];
  mediaHint?: string;       // Describe ideal image/graphic
  cta?: string;             // Call-to-action text + URL
}

export const CONTENT_LIBRARY: PostTemplate[] = [

  // ─── WAVE 0 — Bootstrap: Awareness ───────────────────────────────────────

  {
    id: "intro-problem",
    tags: ["intro", "problem-solution"],
    channels: ["twitter", "threads", "bluesky"],
    wave: [0],
    variants: [
      "Most Shopify loyalty apps are either too simple or too expensive. We built @RewardsPro differently — cashback, tiers, missions, and a full API. 14-day free trial, no credit card. {APP_URL}",
      "Your customers leave after their first order. Loyalty programs change that. Rewards Pro for Shopify — built for merchants who want repeat buyers, not just visitors. {APP_URL}",
      "Retention > acquisition. Always. Rewards Pro brings cashback, tiers, and loyalty automation to Shopify stores of any size. Launching now on the App Store. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#Ecommerce", "#LoyaltyProgram"],
    mediaHint: "Clean product screenshot showing the loyalty dashboard",
  },

  {
    id: "intro-linkedin",
    tags: ["intro", "problem-solution"],
    channels: ["linkedin"],
    wave: [0],
    variants: [
      "We just launched Rewards Pro on the Shopify App Store.\n\nThe idea was simple: most loyalty apps are either too basic or cost thousands per month to configure properly.\n\nRewards Pro ships with cashback rewards, customer tiers, missions, and a full REST API — starting free.\n\nIf you run a Shopify store or work with merchants, I'd love your feedback. Link in comments.",
      "Customer acquisition costs are at an all-time high.\n\nThe solution isn't more ads — it's making existing customers come back.\n\nWe built Rewards Pro to give Shopify merchants a proper loyalty infrastructure without the enterprise price tag. Free to start.\n\nWhat loyalty features matter most to your merchants?",
    ],
    hashtags: ["#Ecommerce", "#Shopify", "#CustomerRetention", "#LoyaltyMarketing"],
    cta: "{APP_URL}",
    mediaHint: "Product feature overview graphic with tier visualisation",
  },

  {
    id: "feature-cashback",
    tags: ["feature"],
    channels: ["twitter", "threads"],
    wave: [0, 1],
    variants: [
      "Rewards Pro spotlight: cashback that actually works.\n\nSet cashback % per product, category, or order total. Multi-currency support. Automatic calculation. Merchants set it once and forget it. {APP_URL}",
      "Cashback isn't just for credit cards. Shopify merchants on Rewards Pro can offer %, fixed, or tiered cashback — automatically applied at checkout. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#Cashback", "#EcommerceMarketing"],
  },

  {
    id: "feature-tiers",
    tags: ["feature"],
    channels: ["twitter", "linkedin", "threads"],
    wave: [0, 1],
    variants: [
      "The Rewards Pro tier system turns one-time buyers into VIPs.\n\nSilver → Gold → Platinum — automatic tier assignment based on spend or orders. Better rewards at every level. Merchants configure it in 10 minutes. {APP_URL}",
      "Tier-based loyalty on Shopify: customers unlock bigger rewards the more they buy. No manual admin. Just pure retention mechanics. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#CustomerLoyalty", "#Ecommerce"],
    mediaHint: "Tier ladder graphic: Silver → Gold → Platinum with reward multipliers",
  },

  // ─── WAVE 1 — Growth: Social Proof ────────────────────────────────────────

  {
    id: "social-proof-count",
    tags: ["social-proof", "stats"],
    channels: ["twitter", "threads", "bluesky"],
    wave: [1, 2],
    variants: [
      "{MERCHANT_COUNT} Shopify merchants are already running loyalty programs on Rewards Pro. Growing every day. Join them → {APP_URL}",
      "The number keeps growing: {INSTALL_COUNT} stores on Rewards Pro. What are they getting right that others aren't? Repeat buyers. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#LoyaltyProgram"],
  },

  {
    id: "use-case-retention",
    tags: ["use-case"],
    channels: ["linkedin", "twitter"],
    wave: [1, 2],
    variants: [
      "A Shopify fashion brand added Rewards Pro last month.\n\nThey set up:\n→ 3% cashback on all orders\n→ Gold tier at £500 lifetime spend\n→ Birthday bonus mission\n\nRepeat purchase rate up. CAC down. That's the math of loyalty. {APP_URL}",
      "Loyalty programs work because they shift customer psychology from 'where's cheapest?' to 'I'm almost Gold tier.'\n\nRewards Pro makes this accessible to every Shopify store. Not just the big ones. {APP_URL}",
    ],
    hashtags: ["#Ecommerce", "#CustomerRetention", "#Shopify"],
  },

  // ─── WAVE 2 — Momentum: Community & Reviews ───────────────────────────────

  {
    id: "review-ask",
    tags: ["review-ask"],
    channels: ["twitter", "linkedin"],
    wave: [2, 3],
    variants: [
      "Using Rewards Pro on your Shopify store?\n\nWe'd love a review on the App Store — and we'll give you 3 months of Pro free as a thank you. Takes 2 minutes. {REVIEW_URL}",
      "If Rewards Pro has helped your store, a review means the world to us — and we'll reward you with 3 months of Pro. Every review helps another merchant find us. {REVIEW_URL}",
    ],
    hashtags: ["#Shopify", "#AppReview"],
    cta: "{REVIEW_URL}",
  },

  {
    id: "milestone",
    tags: ["milestone"],
    channels: ["twitter", "linkedin", "instagram"],
    wave: [2, 3],
    variants: [
      "Milestone: Rewards Pro just hit {INSTALL_COUNT} stores 🎉\n\nStarted with a simple idea — loyalty programs shouldn't cost a fortune. Still believe that. Thank you to every merchant who took a chance on us. {APP_URL}",
      "{INSTALL_COUNT} Shopify stores are now running loyalty programs powered by Rewards Pro.\n\nFrom day one, the goal was accessible loyalty for all store sizes. We're getting there. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#Milestone", "#Ecommerce"],
    mediaHint: "Celebratory graphic with install count prominently displayed",
  },

  // ─── WAVE 3 — Scale: Conversion ───────────────────────────────────────────

  {
    id: "cta-pro",
    tags: ["cta", "offer"],
    channels: ["twitter", "linkedin"],
    wave: [3],
    variants: [
      "Rewards Pro Pro plan: advanced analytics, unlimited cashback rules, email automation, and priority support.\n\n→ Leave us an App Store review and get 3 months free. No catch.\n\n{REVIEW_URL}",
      "Three months of Rewards Pro Pro, free — all we ask is an honest review on the Shopify App Store.\n\nUpgrade your loyalty program. Then review it. {REVIEW_URL}",
    ],
    hashtags: ["#Shopify", "#AppStore", "#FreeUpgrade"],
    cta: "{REVIEW_URL}",
  },

  {
    id: "comparison",
    tags: ["comparison"],
    channels: ["linkedin", "twitter"],
    wave: [3],
    variants: [
      "Rewards Pro vs the alternatives:\n\n✅ Built for Shopify (not bolted on)\n✅ Free to start\n✅ Advanced tiers + cashback + missions\n✅ Full REST API\n✅ Real support\n\nNo inflated pricing. No hidden limits. {APP_URL}",
    ],
    hashtags: ["#Shopify", "#LoyaltyApp", "#Ecommerce"],
    mediaHint: "Clean feature comparison table graphic",
  },
];

/**
 * Select posts for the given wave and channels.
 * Rotates through variants to avoid repetition.
 */
export function selectPosts(
  waveId: number,
  channels: string[],
  tags: string[],
  usedIds: string[] = []
): PostTemplate[] {
  return CONTENT_LIBRARY.filter(post =>
    post.wave.includes(waveId) &&
    post.channels.some(c => channels.includes(c)) &&
    post.tags.some(t => tags.includes(t)) &&
    !usedIds.includes(post.id)
  );
}

export const SUBSTITUTIONS: Record<string, string> = {
  APP_URL: "https://apps.shopify.com/rewards-pro",
  REVIEW_URL: "https://apps.shopify.com/rewards-pro#modal-show=ReviewListingModal",
};
