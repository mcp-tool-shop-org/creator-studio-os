/**
 * Pixelmator Pro — layer style operations.
 *
 * Covers `styles` object properties: blend mode, shadow, inner shadow, stroke, fill.
 * Blend-mode enum is in blendModes.ts.
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §7
 *
 * Color pitfall: all color setters expect 16-bit RGB {0..65535}.
 * Accept 8-bit (0-255) and convert via colorToAS().
 */
import { runAppleScript, escapeAppleScriptString } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";
import { colorToAS, type BlendMode } from "./blendModes.js";

function tellDoc(docName: string, body: string): string {
  const cfg = loadConfig();
  const esc = escapeAppleScriptString(docName);
  return `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${esc}"
${body}
  end tell
end tell`;
}

// ── Blend mode ────────────────────────────────────────────────────────────────

export async function setBlendMode(
  documentName: string,
  layerName: string,
  mode: BlendMode,
): Promise<void> {
  const esc = escapeAppleScriptString(layerName);
  const body = `    set blend mode of layer "${esc}" to ${mode}`;
  await runAppleScript(tellDoc(documentName, body), { timeoutMs: 15_000 });
}

// ── Shadow ────────────────────────────────────────────────────────────────────

export interface ShadowOpts {
  documentName: string;
  layerName: string;
  /** [r, g, b] as 8-bit (0-255) */
  color?: [number, number, number];
  /** Blur radius in pixels */
  blur?: number;
  /** Distance in pixels */
  distance?: number;
  /** Angle in degrees */
  angle?: number;
  /** Opacity 0–100 */
  opacity?: number;
}

export async function setLayerShadow(opts: ShadowOpts): Promise<void> {
  const { documentName, layerName, color, blur, distance, angle, opacity } = opts;
  const esc = escapeAppleScriptString(layerName);
  const setters: string[] = [];
  if (color) setters.push(`    set shadow color of styles of layer "${esc}" to ${colorToAS(...color)}`);
  if (blur != null) setters.push(`    set shadow blur of styles of layer "${esc}" to ${blur}`);
  if (distance != null) setters.push(`    set shadow distance of styles of layer "${esc}" to ${distance}`);
  if (angle != null) setters.push(`    set shadow angle of styles of layer "${esc}" to ${angle}`);
  if (opacity != null) setters.push(`    set shadow opacity of styles of layer "${esc}" to ${opacity}`);
  if (setters.length === 0) return;
  await runAppleScript(tellDoc(documentName, setters.join("\n")), { timeoutMs: 15_000 });
}

// ── Stroke ────────────────────────────────────────────────────────────────────

export type StrokePosition = "inside" | "center" | "outside";

export interface StrokeOpts {
  documentName: string;
  layerName: string;
  /** [r, g, b] as 8-bit */
  color?: [number, number, number];
  width?: number;
  position?: StrokePosition;
  /** Opacity 0–100 */
  opacity?: number;
}

export async function setLayerStroke(opts: StrokeOpts): Promise<void> {
  const { documentName, layerName, color, width, position, opacity } = opts;
  const esc = escapeAppleScriptString(layerName);
  const setters: string[] = [];
  if (color) setters.push(`    set stroke color of styles of layer "${esc}" to ${colorToAS(...color)}`);
  if (width != null) setters.push(`    set stroke width of styles of layer "${esc}" to ${width}`);
  if (position) setters.push(`    set stroke position of styles of layer "${esc}" to ${position}`);
  if (opacity != null) setters.push(`    set stroke opacity of styles of layer "${esc}" to ${opacity}`);
  if (setters.length === 0) return;
  await runAppleScript(tellDoc(documentName, setters.join("\n")), { timeoutMs: 15_000 });
}
