import type { FrameRate } from "./types.js";

const FRAME_DURATION: Record<FrameRate, [number, number]> = {
  "23.98": [1001, 24000],
  "24": [100, 2400],
  "25": [100, 2500],
  "29.97": [1001, 30000],
  "30": [100, 3000],
  "50": [100, 5000],
  "59.94": [1001, 60000],
  "60": [100, 6000],
};

export function frameDurationAttr(rate: FrameRate): string {
  const [n, d] = FRAME_DURATION[rate];
  return `${n}/${d}s`;
}

export function secondsToTime(seconds: number, rate: FrameRate): string {
  if (seconds === 0) return "0s";
  const [n, d] = FRAME_DURATION[rate];
  const frames = Math.round((seconds * d) / n);
  return `${frames * n}/${d}s`;
}

export function frameDurationSeconds(rate: FrameRate): number {
  const [n, d] = FRAME_DURATION[rate];
  return n / d;
}
