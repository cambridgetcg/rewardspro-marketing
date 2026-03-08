/**
 * Wave Engine — determines the active wave and whether to advance/retreat.
 *
 * Decision logic:
 * 1. Read current wave state from wave-state.json
 * 2. Load latest metrics
 * 3. Check advancement: if total installs ≥ next wave threshold AND velocity is healthy → advance
 * 4. Check retreat: if velocity below threshold for retreatAfterDays → step back
 * 5. Determine if posting is due today based on schedule
 * 6. Select content for the active wave
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { WAVES, getWave } from "./wave-config.js";
import { readCache, rollingVelocity } from "../metrics/store.js";

const STATE_PATH = resolve(import.meta.dirname, "../../data/wave-state.json");

export interface WaveState {
  currentWave: number;
  enteredAt: string;              // ISO timestamp when this wave was entered
  lastPostedAt: string | null;    // ISO timestamp of last post
  lowVelocityStartedAt: string | null;   // When velocity first dropped below threshold
  postsThisWeek: number;
  weekStart: string;              // ISO date of current week's Monday
  history: WaveTransition[];
}

export interface WaveTransition {
  from: number;
  to: number;
  reason: "advance" | "retreat";
  metrics: { totalInstalls: number; velocity: number };
  at: string;
}

export function readState(): WaveState {
  if (!existsSync(STATE_PATH)) {
    const monday = getMondayISO();
    return {
      currentWave: 0,
      enteredAt: new Date().toISOString(),
      lastPostedAt: null,
      lowVelocityStartedAt: null,
      postsThisWeek: 0,
      weekStart: monday,
      history: [],
    };
  }
  return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}

export function writeState(state: WaveState): void {
  const dir = resolve(import.meta.dirname, "../../data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export interface WaveDecision {
  waveId: number;
  waveName: string;
  shouldPost: boolean;
  advanced: boolean;
  retreated: boolean;
  reason: string;
  metrics: { totalInstalls: number; velocity: number };
}

/**
 * Evaluate wave state against current metrics and return a decision.
 * Call this once per heartbeat cycle.
 */
export function evaluateWave(): WaveDecision {
  const state = readState();
  const cache = readCache();

  const totalInstalls = cache.current?.totalInstalls ?? 0;
  const velocity = rollingVelocity(cache, 7);

  let waveId = state.currentWave;
  const wave = getWave(waveId);
  const nextWave = WAVES.find(w => w.id === waveId + 1);

  let advanced = false;
  let retreated = false;
  let reason = "steady";
  let newState = { ...state };

  // Reset weekly counter if new week
  const monday = getMondayISO();
  if (state.weekStart !== monday) {
    newState.postsThisWeek = 0;
    newState.weekStart = monday;
  }

  // Check advance
  if (nextWave && totalInstalls >= nextWave.installThreshold && velocity >= nextWave.velocityThreshold) {
    waveId = nextWave.id;
    advanced = true;
    reason = `Advanced: ${totalInstalls} installs ≥ ${nextWave.installThreshold}, velocity ${velocity}/wk ≥ ${nextWave.velocityThreshold}`;
    newState = {
      ...newState,
      currentWave: waveId,
      enteredAt: new Date().toISOString(),
      lowVelocityStartedAt: null,
      history: [
        ...newState.history,
        { from: state.currentWave, to: waveId, reason: "advance", metrics: { totalInstalls, velocity }, at: new Date().toISOString() },
      ],
    };
  }
  // Check retreat (low velocity)
  else if (waveId > 0 && velocity < wave.velocityThreshold) {
    const lowStart = state.lowVelocityStartedAt ? new Date(state.lowVelocityStartedAt) : new Date();
    if (!state.lowVelocityStartedAt) {
      newState.lowVelocityStartedAt = lowStart.toISOString();
    }
    const daysLow = (Date.now() - lowStart.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLow >= wave.retreatAfterDays) {
      waveId = waveId - 1;
      retreated = true;
      reason = `Retreated: velocity ${velocity}/wk < ${wave.velocityThreshold} for ${Math.floor(daysLow)} days`;
      newState = {
        ...newState,
        currentWave: waveId,
        enteredAt: new Date().toISOString(),
        lowVelocityStartedAt: null,
        history: [
          ...newState.history,
          { from: state.currentWave, to: waveId, reason: "retreat", metrics: { totalInstalls, velocity }, at: new Date().toISOString() },
        ],
      };
    } else {
      reason = `Low velocity (${velocity}/wk < ${wave.velocityThreshold}) for ${Math.floor(daysLow)}/${wave.retreatAfterDays} days`;
    }
  } else {
    newState.lowVelocityStartedAt = null;
    reason = `Wave ${waveId} — ${totalInstalls} installs, ${velocity}/wk velocity`;
  }

  // Determine if posting is due
  const currentWaveConfig = getWave(waveId);
  const shouldPost = isPostingDue(newState, currentWaveConfig);

  if (shouldPost) {
    newState.lastPostedAt = new Date().toISOString();
    newState.postsThisWeek += 1;
  }

  writeState(newState);

  return {
    waveId,
    waveName: currentWaveConfig.name,
    shouldPost,
    advanced,
    retreated,
    reason,
    metrics: { totalInstalls, velocity },
  };
}

function isPostingDue(state: WaveState, wave: ReturnType<typeof getWave>): boolean {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();

  // Check if today is a posting day
  if (!wave.postingSchedule.bestDays.includes(dayOfWeek)) return false;

  // Check if we're in a posting hour (±1 hour window)
  const inPostingHour = wave.postingSchedule.bestHours.some(h => Math.abs(hour - h) <= 1);
  if (!inPostingHour) return false;

  // Check we haven't exceeded weekly quota
  if (state.postsThisWeek >= wave.postingSchedule.postsPerWeek) return false;

  // Check we haven't already posted in the last 3 hours
  if (state.lastPostedAt) {
    const hoursSinceLast = (Date.now() - new Date(state.lastPostedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < 3) return false;
  }

  return true;
}

function getMondayISO(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().split("T")[0];
}
