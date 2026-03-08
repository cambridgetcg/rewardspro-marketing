/**
 * Metrics Store — persists install metrics to a local JSON cache.
 *
 * This gives the wave engine a snapshot to work from even when the
 * Shopify Partner API is temporarily unavailable.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { InstallMetrics } from "./shopify-partner.js";

const CACHE_PATH = resolve(import.meta.dirname, "../../data/metrics-cache.json");

export interface MetricsCache {
  current: InstallMetrics | null;
  history: Array<InstallMetrics & { date: string }>;
  updatedAt: string;
}

export function readCache(): MetricsCache {
  if (!existsSync(CACHE_PATH)) {
    return { current: null, history: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
}

export function writeCache(metrics: InstallMetrics): void {
  const existing = readCache();

  // Accumulate totalInstalls by summing velocity snapshots when no direct count
  const prevTotal = existing.current?.totalInstalls ?? 0;
  const newTotal = metrics.totalInstalls > 0
    ? metrics.totalInstalls
    : prevTotal + metrics.installVelocity;

  const updated: MetricsCache = {
    current: { ...metrics, totalInstalls: newTotal },
    history: [
      ...existing.history.slice(-29),  // Keep 30 days of history
      { ...metrics, totalInstalls: newTotal, date: new Date().toISOString().split("T")[0] },
    ],
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(CACHE_PATH, JSON.stringify(updated, null, 2));
}

/**
 * Calculate rolling install velocity over N days from history.
 */
export function rollingVelocity(cache: MetricsCache, days = 7): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return cache.history
    .filter(h => new Date(h.date) >= cutoff)
    .reduce((sum, h) => sum + h.installVelocity, 0);
}
