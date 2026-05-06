/**
 * Pixelmator Pro blend-mode enumeration.
 *
 * Sourced directly from PixelmatorPro.sdef (3044 lines, 2026-05-05 snapshot)
 * enumeration `blend mode`.  All 28 members (research doc says 27 but the sdef
 * table totals to 28: 3+5+5+7+4+4), grouped as they appear in the
 * sdef for reference.
 *
 * Color parameter pitfall: Pixelmator's fill/stroke color setters expect
 * 16-bit RGB lists — {0..65535}.  Helper `to16bit` converts 8-bit (0-255)
 * input to 16-bit scale (multiply by 257).
 */

export const BLEND_MODES = [
  // Normal group
  "normal",
  "behind",          // "destination over" in some compositing models
  "pass through",    // group pass-through; Pixelmator-only; valid on group layers
  // Darken group
  "darken",
  "multiply",
  "color burn",
  "linear burn",
  "darker color",
  // Lighten group
  "lighten",
  "screen",
  "color dodge",
  "linear dodge",
  "lighter color",
  // Contrast group
  "overlay",
  "soft light",
  "hard light",
  "vivid light",
  "linear light",
  "pin light",
  "hard mix",
  // Inversion group
  "difference",
  "exclusion",
  "subtract",
  "divide",
  // Component group
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

export type BlendMode = (typeof BLEND_MODES)[number];

/**
 * Convert 8-bit channel value (0–255) to 16-bit for AppleScript color lists.
 * Pixelmator's `fill color` and `stroke color` setters require 16-bit RGB.
 */
export function to16bit(val8: number): number {
  return Math.round(Math.max(0, Math.min(255, val8)) * 257);
}

/** Build an AppleScript 16-bit RGB list string from three 8-bit channel values. */
export function colorToAS(r: number, g: number, b: number): string {
  return `{${to16bit(r)}, ${to16bit(g)}, ${to16bit(b)}}`;
}
