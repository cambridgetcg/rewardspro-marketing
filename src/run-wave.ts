/**
 * run-wave.ts — Main Marketing Agent Entry Point
 *
 * Called from heartbeat or cron. Runs the full cycle:
 * 1. Fetch latest install metrics (Shopify Partner API + cache)
 * 2. Evaluate current wave (advance/retreat/steady)
 * 3. If posting is due: select content, post to social, log result
 * 4. Notify Yu if wave changes
 *
 * Usage:
 *   npx tsx src/run-wave.ts
 *   npx tsx src/run-wave.ts --dry-run   (preview without posting)
 *   npx tsx src/run-wave.ts --force     (override posting schedule)
 */

import "dotenv/config";
import { fetchInstallMetrics } from "./metrics/shopify-partner.js";
import { readCache, writeCache } from "./metrics/store.js";
import { evaluateWave } from "./waves/wave-engine.js";
import { getWave } from "./waves/wave-config.js";
import { CONTENT_LIBRARY, SUBSTITUTIONS, selectPosts } from "./content/library.js";
import { getAyrshareClient } from "./social/ayrshare.js";
import { readState } from "./waves/wave-engine.js";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

async function main() {
  console.log(`\n🌊 Rewards Pro Marketing Wave Engine`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN" : FORCE ? "FORCE POST" : "NORMAL"}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  // ── 1. Fetch metrics ─────────────────────────────────────────────────────
  const live = await fetchInstallMetrics();
  const cache = readCache();

  if (live) {
    writeCache(live);
    console.log(`📊 Metrics: ${live.totalInstalls ?? "?"} total installs, ${live.installVelocity} this week`);
  } else {
    console.log(`📊 Metrics: using cached data (${cache.current?.totalInstalls ?? 0} installs, ${cache.current?.installVelocity ?? 0}/wk velocity)`);
  }

  // ── 2. Evaluate wave ──────────────────────────────────────────────────────
  const decision = evaluateWave();
  const wave = getWave(decision.waveId);
  const state = readState();

  console.log(`🏄 Wave: ${decision.waveId} — ${decision.waveName}`);
  console.log(`   Status: ${decision.reason}`);
  if (decision.advanced) console.log(`   ✅ ADVANCED to Wave ${decision.waveId}!`);
  if (decision.retreated) console.log(`   ⬇️  RETREATED to Wave ${decision.waveId}`);

  // ── 3. Notify on wave change ──────────────────────────────────────────────
  if (decision.advanced || decision.retreated) {
    const emoji = decision.advanced ? "🚀" : "📉";
    console.log(`\n${emoji} Wave changed — would notify Yu here`);
    // TODO: send via OpenClaw notify when running in agent context
    logEvent("wave-change", {
      wave: decision.waveId,
      reason: decision.reason,
      metrics: decision.metrics,
    });
  }

  // ── 4. Post if due ────────────────────────────────────────────────────────
  const shouldPost = FORCE || decision.shouldPost;

  if (!shouldPost) {
    console.log(`\n⏸️  No post due — next window: ${nextPostWindow(state, wave)}`);
    return;
  }

  console.log(`\n📝 Selecting content for Wave ${decision.waveId}...`);

  // Pick content not recently used
  const usedIds = getRecentlyUsedIds();
  const candidates = selectPosts(
    decision.waveId,
    [...wave.channels.primary, ...wave.channels.secondary],
    wave.contentTags,
    usedIds
  );

  if (candidates.length === 0) {
    console.log("   No fresh content available — resetting usage history");
    clearUsedIds();
    return;
  }

  // Pick the first candidate
  const post = candidates[0];
  const variantIndex = getVariantIndex(post.id, post.variants.length);
  let text = post.variants[variantIndex];

  // Substitute variables
  const installCount = decision.metrics.totalInstalls.toString();
  text = text
    .replace(/\{INSTALL_COUNT\}/g, installCount)
    .replace(/\{MERCHANT_COUNT\}/g, installCount)
    .replace(/\{APP_URL\}/g, SUBSTITUTIONS.APP_URL)
    .replace(/\{REVIEW_URL\}/g, SUBSTITUTIONS.REVIEW_URL);

  // Determine target channels
  const channels = post.channels.filter(c => wave.channels.primary.includes(c));
  if (channels.length === 0) channels.push(...post.channels.slice(0, 2));

  console.log(`   Post ID: ${post.id} (variant ${variantIndex + 1}/${post.variants.length})`);
  console.log(`   Channels: ${channels.join(", ")}`);
  console.log(`   Text preview: "${text.slice(0, 120)}..."`);
  if (post.hashtags) console.log(`   Hashtags: ${post.hashtags.join(" ")}`);

  if (DRY_RUN) {
    console.log(`\n✅ DRY RUN — post NOT sent`);
    return;
  }

  // ── 5. Send to Ayrshare ───────────────────────────────────────────────────
  const client = getAyrshareClient();

  if (!client) {
    console.error("\n❌ Ayrshare client not available — check AYRSHARE_API_KEY");
    return;
  }

  const results = await client.post({
    text,
    platforms: channels,
    hashtags: post.hashtags,
  });

  // ── 6. Log results ────────────────────────────────────────────────────────
  markAsUsed(post.id);

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n📤 Posted:`);
  succeeded.forEach(r => console.log(`   ✅ ${r.platform}: ${r.url ?? r.postId}`));
  failed.forEach(r => console.log(`   ❌ ${r.platform}: ${r.error}`));

  logEvent("post", {
    postId: post.id,
    wave: decision.waveId,
    channels,
    results,
    text: text.slice(0, 200),
  });

  console.log(`\n🏁 Done. ${succeeded.length}/${results.length} platforms succeeded.`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const USED_IDS_PATH = resolve(import.meta.dirname, "../data/used-post-ids.json");
const LOG_PATH = resolve(import.meta.dirname, "../data/event-log.jsonl");

function getRecentlyUsedIds(): string[] {
  if (!existsSync(USED_IDS_PATH)) return [];
  const data = JSON.parse(readFileSync(USED_IDS_PATH, "utf-8"));
  // Clear ids older than 30 days so posts can recycle
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return Object.entries(data)
    .filter(([, ts]) => (ts as number) > cutoff)
    .map(([id]) => id);
}

function markAsUsed(id: string): void {
  const existing = existsSync(USED_IDS_PATH)
    ? JSON.parse(readFileSync(USED_IDS_PATH, "utf-8"))
    : {};
  existing[id] = Date.now();
  writeFileSync(USED_IDS_PATH, JSON.stringify(existing, null, 2));
}

function clearUsedIds(): void {
  writeFileSync(USED_IDS_PATH, "{}");
}

function getVariantIndex(postId: string, variantCount: number): number {
  const used = existsSync(USED_IDS_PATH)
    ? JSON.parse(readFileSync(USED_IDS_PATH, "utf-8"))
    : {};
  // Cycle through variants in order
  const timesUsed = Object.keys(used).filter(k => k.startsWith(postId)).length;
  return timesUsed % variantCount;
}

function logEvent(type: string, data: any): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), type, ...data }) + "\n";
  writeFileSync(LOG_PATH, entry, { flag: "a" });
}

function nextPostWindow(state: any, wave: any): string {
  const now = new Date();
  const remaining = wave.postingSchedule.postsPerWeek - (state.postsThisWeek ?? 0);
  return `${remaining} posts remaining this week`;
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
