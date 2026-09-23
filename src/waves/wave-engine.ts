/** Retired commercial scheduler. No metrics thresholds, state writes or posting. */
export interface WaveDecision {
  waveId: number;
  waveName: string;
  shouldPost: boolean;
  advanced: boolean;
  retreated: boolean;
  reason: string;
}

export function evaluateWave(): WaveDecision {
  return {
    waveId: -1,
    waveName: "Retired",
    shouldPost: false,
    advanced: false,
    retreated: false,
    reason: "Commercial outreach is retired. No posting, growth target or replacement work is due.",
  };
}
