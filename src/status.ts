/**
 * status.ts — Print current wave status and metrics to stdout.
 * Usage: npx tsx src/status.ts
 */

import "dotenv/config";
import { readCache, rollingVelocity } from "./metrics/store.js";
import { readState } from "./waves/wave-engine.js";
import { getWave, WAVES } from "./waves/wave-config.js";

const cache = readCache();
const state = readState();
const wave = getWave(state.currentWave);
const velocity = rollingVelocity(cache, 7);
const totalInstalls = cache.current?.totalInstalls ?? 0;
// Use activeInstalls for threshold progress (excludes churned/test stores)
const activeInstalls = cache.current?.activeInstalls ?? totalInstalls;

const nextWave = WAVES.find(w => w.id === state.currentWave + 1);
const progressToNext = nextWave
  ? Math.min(100, Math.round((activeInstalls / nextWave.installThreshold) * 100))
  : 100;

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║      Rewards Pro — Marketing Wave Status      ║`);
console.log(`╚══════════════════════════════════════════════╝`);
console.log(`\nActive Wave:    Wave ${state.currentWave} — ${wave.name}`);
console.log(`Description:    ${wave.description}`);
console.log(`\nMetrics:`);
console.log(`  Total installs:      ${totalInstalls}`);
console.log(`  7-day velocity:      ${velocity} installs/week`);
console.log(`  Posts this week:     ${state.postsThisWeek}/${wave.postingSchedule.postsPerWeek}`);
console.log(`  Last posted:         ${state.lastPostedAt ?? "never"}`);

if (nextWave) {
  console.log(`\nNext Wave (${nextWave.name}):`);
  console.log(`  Install threshold:   ${nextWave.installThreshold} (${progressToNext}% there)`);
  console.log(`  Velocity needed:     ${nextWave.velocityThreshold}/week`);
  const bar = "█".repeat(Math.round(progressToNext / 10)) + "░".repeat(10 - Math.round(progressToNext / 10));
  console.log(`  Progress: [${bar}] ${progressToNext}%`);
}

console.log(`\nPosting Schedule:`);
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
console.log(`  Days: ${wave.postingSchedule.bestDays.map(d => dayNames[d]).join(", ")}`);
console.log(`  Times: ${wave.postingSchedule.bestHours.map(h => `${h}:00 UTC`).join(", ")}`);
console.log(`  Channels: ${wave.channels.primary.join(", ")}`);

console.log(`\nHistory:`);
if (state.history.length === 0) {
  console.log(`  No transitions yet (Wave 0 since start)`);
} else {
  state.history.slice(-5).forEach(h => {
    console.log(`  ${h.at.slice(0, 10)}: Wave ${h.from} → Wave ${h.to} (${h.reason}) [${h.metrics.totalInstalls} installs, ${h.metrics.velocity}/wk]`);
  });
}

console.log(`\nCache:`);
console.log(`  Last updated: ${cache.updatedAt ?? "never"}`);
console.log(`  History points: ${cache.history.length} days`);
console.log("");
